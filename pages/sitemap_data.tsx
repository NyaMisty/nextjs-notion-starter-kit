// import { GetStaticProps } from 'next'
// import type { SiteMap } from '@/lib/types'
import * as React from 'react'

import { getSiteMap } from '@/lib/get-site-map'
import { SiteMap } from '@/lib/types'
import { GetStaticProps } from 'next'
import { serializeSiteMap } from '@/lib/static-site-map'

export const getStaticProps: GetStaticProps<{ siteMap: SiteMap }>  =  async (
  _context
) => {
  const siteMap = await getSiteMap()
  return {
    props: {
      siteMap
    }
  }
}


export default function createSitemap({ siteMap }) {
  return (
    <>
      <div id="sitemapJson" dangerouslySetInnerHTML={{__html: serializeSiteMap(siteMap)}} />
    </>
  )
}

