import type { GetServerSidePropsContext } from "next";
import { gzip, ungzip } from "pako";

import type { SiteMap } from "./types";

export const SITEMAP_JSON_HEADER = "SiteMap JSON Gzip Content:"
export const SITEMAP_JSON_FOOTER = "\n===SiteMap JSON Gzip Content End==="

function compressToBase64Pako(str: string) {
  const compressed = gzip(str);
  return Buffer.from(compressed).toString("base64");
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len;  i++) {
    bytes[i] = binary.codePointAt(i)!;
  }
  return bytes;
}

export function decompressFromBase64Pako(base64: string) {
  const compressedData = base64ToUint8Array(base64);
  const decompressedData = ungzip(compressedData);
  return new TextDecoder().decode(decompressedData);
}


export async function getSiteMapStatic(context : GetServerSidePropsContext) {
  const { req } = context

  const siteMapResp = await fetch(`http://${req.headers.host}/sitemap_data`)
  const siteMapStr = await siteMapResp.text()
  const siteMapJsonStart = siteMapStr.indexOf(SITEMAP_JSON_HEADER)
  if (siteMapJsonStart === -1) {
    return null
  }
  const siteMapJsonEnd = siteMapStr.indexOf(SITEMAP_JSON_FOOTER, siteMapJsonStart)
  if (siteMapJsonEnd === -1) {
    return null
  }
  const siteMapJsonContent = siteMapStr.slice(siteMapJsonStart + SITEMAP_JSON_HEADER.length, siteMapJsonEnd).trim()
  if (!siteMapJsonContent) {
    return null
  }
  let siteMapJson = await decompressFromBase64Pako(siteMapJsonContent)

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

export async function serializeSiteMap(siteMap: SiteMap) {
  return SITEMAP_JSON_HEADER + await compressToBase64Pako(JSON.stringify(siteMap)) + SITEMAP_JSON_FOOTER
}