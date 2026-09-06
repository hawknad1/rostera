"use client"

import { useEffect, useSyncExternalStore } from "react"

import { writeStaffOfflineCache } from "@/modules/staff-app/offline-store"

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}

export function StaffCacheSync({
  userId,
  organizationId,
  patch,
}: {
  userId: string
  organizationId: string
  patch: Omit<Parameters<typeof writeStaffOfflineCache>[2], "cachedAt"> & { cachedAt?: string }
}) {
  const cachedAt = patch.cachedAt ?? ""
  const serialized = JSON.stringify(patch)

  useEffect(() => {
    const parsed = JSON.parse(serialized) as typeof patch
    writeStaffOfflineCache(userId, organizationId, {
      ...parsed,
      cachedAt: parsed.cachedAt || cachedAt || new Date().toISOString(),
    })
  }, [userId, organizationId, serialized, cachedAt])

  return null
}
