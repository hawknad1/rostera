const CROSS_SITE = "cross-site"

export function isCrossSiteExportRequest(request: Request) {
  const site = request.headers.get("sec-fetch-site")?.trim().toLowerCase()
  return site === CROSS_SITE
}

export const exportResponseHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
} as const
