// import { GetStaticProps } from 'next'
// import type { SiteMap } from '@/lib/types'
import type { GetStaticProps, InferGetStaticPropsType } from 'next'
import * as React from 'react'

import type { SiteMap } from '@/lib/types'
import { getSiteMap } from '@/lib/get-site-map'
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


export default function createSitemap({ siteMap }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <div id="sitemapJson" dangerouslySetInnerHTML={{__html: serializeSiteMap(siteMap)}} />
    </>
  )
}

