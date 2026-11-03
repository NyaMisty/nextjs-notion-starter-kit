import { type Block, type ExtendedRecordMap } from 'notion-types'
import {
  getAllPagesInSpace,
  getBlockValue,
  getPageProperty,
  uuidToId
} from 'notion-utils'
import pMemoize from 'p-memoize'

import type * as types from './types'
import * as config from './config'
import { includeNotionIdInUrls } from './config'
import { getCanonicalPageId } from './get-canonical-page-id'
import { notion } from './notion-api'

const uuid = !!includeNotionIdInUrls

export async function getSiteMap(): Promise<types.SiteMap> {
  const partialSiteMap = await getAllPages(
    config.rootNotionPageId,
    config.rootNotionSpaceId ?? undefined,
    {
      // filter out private blocks to avoid get indexed by search engines
      filterBlocks: true
    }
  )

  return {
    site: config.site,
    ...partialSiteMap
  } as types.SiteMap
}

const getAllPages = pMemoize(getAllPagesImpl, {
  cacheKey: (...args) => JSON.stringify(args)
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const requestInterval = Number(process.env.NOTION_REQUEST_SLOW_INTERVAL ?? 0)
let lastRequestTime = 0

const throttle = async () => {
  if (!requestInterval) {
    return
  }

  const wait = lastRequestTime + requestInterval - Date.now()
  if (wait > 0) {
    await sleep(wait)
  }
  lastRequestTime = Date.now()
}

const getPage = async (pageId: string, opts?: any) => {
  console.log('\nnotion getPage', uuidToId(pageId))

  let lastError: any
  for (let attempt = 0; attempt < 5; attempt++) {
    await throttle()

    try {
      return await notion.getPage(pageId, {
        ofetchOptions: {
          timeout: 30_000
        },
        ...opts
      })
    } catch (err: any) {
      lastError = err

      // Cloudflare/auth rejections won't succeed on retry.
      if (err?.statusCode === 403) {
        throw err
      }

      const retryAfter = Number(err?.response?.headers?.get?.('retry-after'))
      const delay =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : err?.statusCode === 429
            ? 2000 * 2 ** attempt
            : 1000 * (attempt + 1)

      await sleep(delay)
    }
  }

  throw lastError
}

const getPageWithFilter = async (pageId: string, opts?: any) => {
  const page = await getPage(pageId, opts)
  // enum by content to ensure we only traverses blocks that are actually
  // present in the page, as some blocks may not be rendered (such as filtered
  // in collection views)
  const enumBlockIdsByContent = async (blockId: string) => {
    const block = getBlockValue(page.block[blockId])
    // console.log("Processing block", blockId, ": ", block)
    if (!block || !block.content) {
      return []
    }
    const ret = [blockId]
    for (const blockId of block.content) {
      ret.push(...(await enumBlockIdsByContent(blockId)))
    }
    return ret
  }

  const blockIds = await enumBlockIdsByContent(pageId)
  // The page's own block has no `content` when the page is empty, in which
  // case the enumeration above returns an empty list. Keep the page block
  // regardless, otherwise the `Public` property below can't be read and the
  // page would incorrectly be treated as public.
  if (getBlockValue(page.block[pageId]) && !blockIds.includes(pageId)) {
    blockIds.push(pageId)
  }
  page.block = Object.fromEntries(
    Object.entries(page.block).filter(([key]) => blockIds.includes(key))
  )
  return page
}

const isPagePublic = (block: Block, recordMap: ExtendedRecordMap) => {
  const collection = getBlockValue(recordMap.collection?.[block.parent_id])
  const hasPublicProperty =
    !!collection?.schema &&
    Object.keys(collection.schema).some(
      (key) => collection.schema[key]?.name?.toLowerCase() === 'public'
    )

  if (!hasPublicProperty) {
    // Pages outside a database that defines a `Public` property keep the old
    // default of being public.
    return true
  }

  // Inside such a database, only an explicitly checked `Public` value is
  // public. `getPageProperty` returns null when the page block has no
  // properties at all (e.g. a freshly created empty page), which must be
  // treated as private instead of falling through to the old `?? true`.
  return getPageProperty<boolean | null>('Public', block, recordMap) === true
}

async function getAllPagesImpl(
  rootNotionPageId: string,
  rootNotionSpaceId?: string,
  {
    maxDepth = 1,
    filterBlocks = false
  }: {
    maxDepth?: number
    filterBlocks?: boolean
  } = {}
): Promise<Partial<types.SiteMap>> {
  const pageMap = await getAllPagesInSpace(
    rootNotionPageId,
    rootNotionSpaceId,
    !filterBlocks ? getPage : getPageWithFilter,
    {
      maxDepth,
      // Serialize the traversal so Notion doesn't rate-limit the sitemap build.
      concurrency: 1
    }
  )

  const canonicalPageMap = Object.keys(pageMap).reduce(
    (map: Record<string, string>, pageId: string) => {
      const recordMap = pageMap[pageId]
      if (!recordMap) {
        // throw new Error(`Error loading page "${pageId}"`)
        console.warn(`Error loading page "${pageId}"`)
        return map
      }

      const block = getBlockValue(recordMap.block[pageId])
      if (!block) {
        // Without the page block we can't evaluate its `Public` property, so
        // default to excluding it from the sitemap rather than leaking a
        // possibly private page.
        console.warn(`Error loading page "${pageId}": missing page block`)
        return map
      }

      if (!isPagePublic(block, recordMap)) {
        return map
      }

      const canonicalPageId = getCanonicalPageId(pageId, recordMap, {
        uuid
      })!

      if (map[canonicalPageId]) {
        // you can have multiple pages in different collections that have the same id
        // TODO: we may want to error if neither entry is a collection page
        console.warn('error duplicate canonical page id', {
          canonicalPageId,
          pageId,
          existingPageId: map[canonicalPageId]
        })

        return map
      } else {
        return {
          ...map,
          [canonicalPageId]: pageId
        }
      }
    },
    {}
  )

  return {
    pageMap,
    canonicalPageMap
  }
}
