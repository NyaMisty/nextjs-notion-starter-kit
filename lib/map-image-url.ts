import { type Block } from 'notion-types'
import { defaultMapImageUrl } from 'notion-utils'

import { defaultPageCover, defaultPageIcon } from './config'

export const mapImageUrl = (url: string | undefined, block: Block) => {
  if (!url || url === defaultPageCover || url === defaultPageIcon) {
    return url
  }

  if (!url.startsWith("https://file.notion.so")) {
    url = defaultMapImageUrl(url, block)
  }
  return url?.replace("http://", "https://notion-image-proxy.misty.workers.dev/").replace("https://", "https://notion-image-proxy.misty.workers.dev/")
}
