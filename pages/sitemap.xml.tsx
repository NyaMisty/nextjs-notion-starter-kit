import type { GetServerSideProps } from 'next'

import type { SiteMap } from '@/lib/types'
import { host } from '@/lib/config'
//import { getSiteMap } from '@/lib/get-site-map'
import { getSiteMapStatic } from '@/lib/static-site-map'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, res } = context
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({ error: 'method not allowed' }))
    res.end()
    return {
      props: {}
    }
  }

  const siteMap = await getSiteMapStatic(context)
  if (siteMap === null) {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({ error: 'failed to parse sitemap.json' }))
    res.end()
    return {
      props: {}
    }
  }

  console.log(siteMap)

  // cache for up to 8 hours
  res.setHeader(
    'Cache-Control',
    'public, max-age=7200, stale-while-revalidate=28800'
  )
  res.setHeader('Content-Type', 'text/xml')
  res.write(createSitemap(siteMap))
  res.end()

  return {
    props: {}
  }
}

const createSitemap = (siteMap: SiteMap) =>
  `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${host}</loc>
    </url>

    <url>
      <loc>${host}/</loc>
    </url>

    ${Object.keys(siteMap.canonicalPageMap)
      .map((canonicalPagePath) =>
        `
          <url>
            <loc>${host}/${canonicalPagePath}</loc>
          </url>
        `.trim()
      )
      .join('')}
  </urlset>
`

export default function noop() {
  return null
}
