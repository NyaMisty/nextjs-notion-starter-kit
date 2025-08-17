import { getAllPagesInSpace, getPageProperty, uuidToId } from 'notion-utils'
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

const getPage = async (pageId: string, opts?: any) => {
  console.log('\nnotion getPage', uuidToId(pageId))
  return notion.getPage(pageId, {
    kyOptions: {
      timeout: 30_000
    },
    ...opts
  })
}

const getPageWithFilter = async (pageId: string, opts?: any) => {
  const page = await getPage(pageId, opts)
  // enum by content to ensure we only traverses blocks that are actually
  // present in the page, as some blocks may not be rendered (such as filtered
  // in collection views)
  const enumBlockIdsByContent = async (blockId: string) => {
    const block = page.block[blockId]?.value
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
  page.block = Object.fromEntries(
    Object.entries(page.block).filter(([key, _]) => blockIds.includes(key))
  );
  return page
}

async function getAllPagesImpl(
  rootNotionPageId: string,
  rootNotionSpaceId?: string,
  {
    maxDepth = 1,
    filterBlocks = false,
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
      maxDepth
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

      const block = recordMap.block[pageId]?.value
      if (
        !(getPageProperty<boolean | null>('Public', block!, recordMap) ?? true)
      ) {
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
