import pMemoize from 'p-memoize'
import { getAllPagesInSpace } from 'notion-utils'

import * as types from './types'
import { includeNotionIdInUrls } from './config'
import { notion } from './notion'
import { getCanonicalPageId } from './get-canonical-page-id'

const uuid = !!includeNotionIdInUrls

export const getAllPages = pMemoize(getAllPagesImpl, { maxAge: 60000 * 5 })

// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getAllPagesImpl(
  rootNotionPageId: string,
  rootNotionSpaceId: string
): Promise<Partial<types.SiteMap>> {
  /* eslint-disable */
  const getPage = async (pageId) => {
    // await delay(process.env.NOTION_REQUEST_SLOW_INTERVAL)
    return notion.getPage(pageId)
  }
  /* eslint-enable */
  const pageMap = await getAllPagesInSpace(
    rootNotionPageId,
    rootNotionSpaceId,
    getPage,
    { concurrency: parseInt(process.env.NOTION_REQUEST_CONCURRENCY || '4') }
  )

  const canonicalPageMap = Object.keys(pageMap).reduce(
    (map, pageId: string) => {
      const recordMap = pageMap[pageId]
      if (!recordMap) {
        // throw new Error(`Error loading page "${pageId}"`)
        console.warn(`Error loading page "${pageId}"`)
      }

      const canonicalPageId = getCanonicalPageId(pageId, recordMap, {
        uuid
      })

      if (map[canonicalPageId]) {
        console.error(
          'error duplicate canonical page id',
          canonicalPageId,
          pageId,
          map[canonicalPageId]
        )

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
