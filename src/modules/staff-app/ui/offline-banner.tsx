"use client"

import { useSyncExternalStore } from "react"

import { offlineBannerText } from "@/modules/staff-app/format"
import { readStaffOfflineCache } from "@/modules/staff-app/offline-store"

function subscribeConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
    window.removeEventListener("storage", onChange)
  }
}

export function OfflineBanner({
  userId,
  organizationId,
  timeZone,
}: {
  userId: string
  organizationId: string
  timeZone: string
}) {
  const online = useSyncExternalStore(
    subscribeConnectivity,
    () => navigator.onLine,
    () => true,
  )
  const cachedAt = useSyncExternalStore(
    subscribeConnectivity,
    () => readStaffOfflineCache(userId, organizationId)?.cachedAt ?? null,
    () => null,
  )

  if (online) {
    return null
  }

  return (
    <p
      className="border-b border-border bg-muted px-4 py-2 text-center text-sm text-foreground"
      role="status"
    >
      {cachedAt
        ? offlineBannerText(cachedAt, timeZone)
        : "You're offline. Showing your most recently cached roster when available."}
    </p>
  )
}
