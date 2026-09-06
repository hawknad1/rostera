const CACHE_NAME = "rostera-staff-v1"

// Keep in sync with src/modules/staff-app/sw-cache-policy.ts.
// Personalized /me HTML, RSC payloads, and navigations must never enter Cache Storage.
function isPersonalizedStaffRequest(request, url) {
  if (url.pathname === "/me" || url.pathname.startsWith("/me/")) {
    return true
  }

  if (request.mode === "navigate" || request.destination === "document") {
    return true
  }

  return url.searchParams.has("_rsc")
}

function isSharedCacheable(request) {
  if (request.method !== "GET") {
    return false
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return false
  }

  if (isPersonalizedStaffRequest(request, url)) {
    return false
  }

  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.svg"
  )
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  if (!isSharedCacheable(event.request)) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) {
          return cached
        }

        return new Response("You're offline.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      }),
  )
})
