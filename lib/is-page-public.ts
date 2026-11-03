import { type Block, type ExtendedRecordMap } from 'notion-types'
import { getBlockValue, getPageProperty } from 'notion-utils'

/**
 * Returns whether a page should be treated as public.
 *
 * If the page belongs to a database whose schema defines a `Public` property,
 * only an explicitly checked value counts as public. Pages outside such a
 * database keep the previous default of being public.
 */
export function isPagePublic(block: Block, recordMap: ExtendedRecordMap) {
  const collection = getBlockValue(recordMap.collection?.[block.parent_id])
  const hasPublicProperty =
    !!collection?.schema &&
    Object.keys(collection.schema).some(
      (key) => collection.schema[key]?.name?.toLowerCase() === 'public'
    )

  if (!hasPublicProperty) {
    return true
  }

  // `getPageProperty` returns null when the page block has no properties at
  // all (e.g. a freshly created empty page), which must be treated as private.
  return getPageProperty<boolean | null>('Public', block, recordMap) === true
}
