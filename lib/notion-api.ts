import { NotionAPI } from 'notion-client'

// Notion is behind Cloudflare, which returns a 403 HTML challenge for
// non-browser user agents. Send a normal browser UA so page fetches work from
// the server/build.
const browserUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export const notion = new NotionAPI({
  apiBaseUrl: process.env.NOTION_API_BASE_URL,
  authToken: process.env.NOTION_API_AUTHTOKEN,
  ofetchOptions: {
    headers: {
      'user-agent': browserUserAgent
    }
  }
})
