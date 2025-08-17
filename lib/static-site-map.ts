import type { GetServerSidePropsContext } from "next";

import type { SiteMap } from "./types";

export const SITEMAP_JSON_HEADER = "SiteMap JSON Content:"

export async function getSiteMapStatic(context : GetServerSidePropsContext) {
  const { req } = context

  const siteMapResp = await fetch(`http://${req.headers.host}/sitemap_data`)
  const siteMapStr = await siteMapResp.text()
  const siteMapJsonStart = siteMapStr.indexOf(SITEMAP_JSON_HEADER)

  if (siteMapJsonStart === -1) {
    return null
  }
  let siteMapJson = siteMapStr.slice(Math.max(0, siteMapJsonStart + SITEMAP_JSON_HEADER.length))

  try {
    JSON.parse(siteMapJson)
  } catch(err_) {
    const err = err_ as Error
    const m = err.message.match(/position\s+(\d+)/)
    if (m && m[1] !== undefined) {
      siteMapJson = siteMapJson?.slice(0, Number(m[1]))
    }
  }

  const siteMap : SiteMap = JSON.parse(siteMapJson) as SiteMap
  
  return siteMap
}

export function serializeSiteMap(siteMap: SiteMap) {
  return SITEMAP_JSON_HEADER + JSON.stringify(siteMap)
}