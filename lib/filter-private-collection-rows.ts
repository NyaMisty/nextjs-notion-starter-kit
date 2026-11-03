import type { ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'

import { isPagePublic } from './is-page-public'

const normalizeId = (id: string) => id.replace(/-/g, '').toLowerCase()

function filterBlockIds(value: unknown, privateIds: Set<string>) {
  if (!value || typeof value !== 'object') {
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      filterBlockIds(item, privateIds)
    }
    return
  }

  const record = value as Record<string, unknown>
  for (const [key, child] of Object.entries(record)) {
    if (key === 'blockIds' && Array.isArray(child)) {
      record[key] = child.filter(
        (id) => typeof id !== 'string' || !privateIds.has(normalizeId(id))
      )
    } else {
      filterBlockIds(child, privateIds)
    }
  }
}

/**
 * Removes non-Public collection rows from a page record map before it is sent
 * to the client. This keeps rendered collection views (e.g. the home page
 * table) in sync with the sitemap filter.
 */
export function filterPrivateCollectionRows(
  recordMap: ExtendedRecordMap,
  currentPageId?: string
) {
  const currentId = currentPageId ? normalizeId(currentPageId) : undefined
  const privateIds = new Set<string>()
  const privateBlockIds: string[] = []

  for (const [blockId, blockBox] of Object.entries(recordMap.block ?? {})) {
    const normalizedId = normalizeId(blockId)
    if (currentId && normalizedId === currentId) {
      continue
    }

    const block = getBlockValue(blockBox)
    if (!block || block.type !== 'page') {
      continue
    }
    if (isPagePublic(block, recordMap)) {
      continue
    }

    privateIds.add(normalizedId)
    privateBlockIds.push(blockId)
  }

  if (!privateIds.size) {
    return recordMap
  }

  filterBlockIds(recordMap.collection_query, privateIds)

  // Drop the private rows' blocks so they are not serialized to the client.
  for (const blockId of privateBlockIds) {
    delete recordMap.block[blockId]
  }

  return recordMap
}
