import { Block } from 'notion-types'
import { defaultMapImageUrl } from 'react-notion-x'

import { defaultPageCover, defaultPageIcon } from './config'

export const mapImageUrl = (url: string, block: Block) => {
  if (url === defaultPageCover || url === defaultPageIcon) {
    return url
  }

  if (!url.startsWith("https://file.notion.so")) {
    url = defaultMapImageUrl(url, block)
  }
  return url.replace("http://", "https://notion-image-proxy.misty.workers.dev/").replace("https://", "https://notion-image-proxy.misty.workers.dev/")
}
