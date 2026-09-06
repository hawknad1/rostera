import {
  emptyStaffOfflineCache,
  parseStaffOfflineCache,
  staffCacheStorageKey,
  mergeStaffOfflineCache,
} from "@/modules/staff-app/cache"
import type { StaffOfflineCache } from "@/modules/staff-app/types"

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function readStaffOfflineCache(userId: string, organizationId: string): StaffOfflineCache | null {
  if (!canUseStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(staffCacheStorageKey(userId, organizationId))
    if (!raw) {
      return null
    }

    const parsed = parseStaffOfflineCache(JSON.parse(raw) as unknown)
    if (!parsed || parsed.userId !== userId || parsed.organizationId !== organizationId) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function writeStaffOfflineCache(
  userId: string,
  organizationId: string,
  patch: Parameters<typeof mergeStaffOfflineCache>[1],
) {
  if (!canUseStorage()) {
    return
  }

  const current =
    readStaffOfflineCache(userId, organizationId) ?? emptyStaffOfflineCache({ userId, organizationId })
  const next = mergeStaffOfflineCache(current, patch)

  try {
    window.localStorage.setItem(staffCacheStorageKey(userId, organizationId), JSON.stringify(next))
  } catch {
    // Ignore quota / private-mode failures. Online data remains authoritative.
  }
}
