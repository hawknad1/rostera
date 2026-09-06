export function isAuthRoute(pathname: string) {
  return pathname.startsWith("/login") || pathname.startsWith("/auth")
}

export function isSessionExemptPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/icon.svg" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/invite/accept") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/internal/")
  )
}

export function shouldBypassSessionRefresh(pathname: string) {
  return pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/internal/")
}
