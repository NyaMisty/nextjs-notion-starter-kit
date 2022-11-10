import { GetServerSidePropsContext } from "next";
import { SiteMap } from "./types";

export const SITEMAP_JSON_HEADER = "SiteMap JSON Content:"

export async function getSiteMapStatic(context : GetServerSidePropsContext) {
  const { req } = context

  const siteMapResp = await fetch(`http://${req.headers.host}/sitemap_data`)
  const siteMapStr = await siteMapResp.text()
  const siteMapJsonStart = siteMapStr.indexOf(SITEMAP_JSON_HEADER)

  if (siteMapJsonStart < 0) {
    return null
  }
  let siteMapJson = siteMapStr.substring(siteMapJsonStart + SITEMAP_JSON_HEADER.length)

  try {
    JSON.parse(siteMapJson)
  } catch(e) {
    const m = e.message.match(/position\s+(\d+)/)
    if (m)
      siteMapJson = siteMapJson.slice(0, m[1])
  }

  const siteMap : SiteMap = JSON.parse(siteMapJson)
  
  return siteMap
}

export function serializeSiteMap(siteMap: SiteMap) {
  return SITEMAP_JSON_HEADER + JSON.stringify(siteMap)
}