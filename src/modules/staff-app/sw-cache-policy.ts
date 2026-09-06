export type ServiceWorkerRequestView = {
  method: string
  origin: string
  pageOrigin: string
  pathname: string
  search?: string
  mode?: string
  destination?: string
}

function isStaffDocumentPath(pathname: string) {
  return pathname === "/me" || pathname.startsWith("/me/")
}

export function isPersonalizedStaffRequest(request: ServiceWorkerRequestView) {
  if (isStaffDocumentPath(request.pathname)) {
    return true
  }

  if (request.mode === "navigate" || request.destination === "document") {
    return true
  }

  const search = request.search ?? ""
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  return params.has("_rsc")
}

export function isSharedServiceWorkerCacheable(request: ServiceWorkerRequestView) {
  if (request.method !== "GET") {
    return false
  }

  if (request.origin !== request.pageOrigin) {
    return false
  }

  if (isPersonalizedStaffRequest(request)) {
    return false
  }

  return (
    request.pathname.startsWith("/_next/static/") ||
    request.pathname === "/manifest.webmanifest" ||
    request.pathname.startsWith("/icons/") ||
    request.pathname === "/icon.svg"
  )
}

export function shouldServiceWorkerHandleFetch(request: ServiceWorkerRequestView) {
  return isSharedServiceWorkerCacheable(request)
}
