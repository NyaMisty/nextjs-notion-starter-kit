import { NotionAPI } from 'notion-client'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Notion is behind Cloudflare, which returns a 403 HTML challenge for
// non-browser user agents. Send a normal browser UA so page fetches work from
// the server/build.
const browserUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// Notion rate-limits page fetches (429). Serialize requests, space them by
// NOTION_REQUEST_SLOW_INTERVAL ms, and retry with backoff.
const parsedInterval = Number.parseInt(
  process.env.NOTION_REQUEST_SLOW_INTERVAL ?? '0',
  10
)
const requestInterval = Number.isFinite(parsedInterval) ? parsedInterval : 0

let lastRequestTime = 0
let requestQueue: Promise<unknown> = Promise.resolve()

function scheduleRequest<T>(fn: () => Promise<T>): Promise<T> {
  const run = requestQueue.then(async () => {
    if (requestInterval > 0) {
      const wait = lastRequestTime + requestInterval - Date.now()
      if (wait > 0) {
        await sleep(wait)
      }
      lastRequestTime = Date.now()
    }

    return fn()
  })

  requestQueue = run.then(
    () => undefined,
    () => undefined
  )

  return run
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await scheduleRequest(fn)
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

const notionApi = new NotionAPI({
  apiBaseUrl: process.env.NOTION_API_BASE_URL,
  authToken: process.env.NOTION_API_AUTHTOKEN,
  ofetchOptions: {
    headers: {
      'user-agent': browserUserAgent
    }
  }
})

const getPageImpl = notionApi.getPage.bind(notionApi)
notionApi.getPage = ((pageId: string, opts?: any) =>
  withRetry(() => getPageImpl(pageId, opts))) as typeof notionApi.getPage

export const notion = notionApi
