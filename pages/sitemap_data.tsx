// import { GetStaticProps } from 'next'
// import type { SiteMap } from '@/lib/types'
import type { GetStaticProps, InferGetStaticPropsType } from 'next'
import * as React from 'react'

import { getSiteMap } from '@/lib/get-site-map'
import { serializeSiteMap } from '@/lib/static-site-map'

export const getStaticProps: GetStaticProps<{ siteMapSerialized: string }>  =  async (
  _context
) => {
  const siteMap = await getSiteMap()

  const siteMapSerialized = await serializeSiteMap(siteMap);

  return {
    props: {
      siteMapSerialized
    }
  }
}


export default function createSitemap({ siteMapSerialized }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <div id="sitemapJson" dangerouslySetInnerHTML={{__html: siteMapSerialized}} />
    </>
  )
}
