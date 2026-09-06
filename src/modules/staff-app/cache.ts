import type { StaffOfflineCache } from "@/modules/staff-app/types"
import { OFFLINE_MUTATION_MESSAGE } from "@/modules/staff-app/format"

export const STAFF_CACHE_VERSION = 1 as const
export const STAFF_CACHE_KEY_PREFIX = "rostera:staff-offline:v1"

export { OFFLINE_MUTATION_MESSAGE }

export function staffCacheStorageKey(userId: string, organizationId: string) {
  return `${STAFF_CACHE_KEY_PREFIX}:${userId}:${organizationId}`
}

export function emptyStaffOfflineCache(input: {
  userId: string
  organizationId: string
  cachedAt?: string
}): StaffOfflineCache {
  return {
    version: STAFF_CACHE_VERSION,
    userId: input.userId,
    organizationId: input.organizationId,
    cachedAt: input.cachedAt ?? new Date(0).toISOString(),
    home: null,
    roster: null,
    shifts: [],
    shiftDetails: {},
    notifications: null,
  }
}

export function parseStaffOfflineCache(raw: unknown): StaffOfflineCache | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const value = raw as Partial<StaffOfflineCache>
  if (value.version !== STAFF_CACHE_VERSION) {
    return null
  }

  if (typeof value.userId !== "string" || value.userId.length === 0) {
    return null
  }

  if (typeof value.organizationId !== "string" || value.organizationId.length === 0) {
    return null
  }

  if (typeof value.cachedAt !== "string" || value.cachedAt.length === 0) {
    return null
  }

  return {
    version: STAFF_CACHE_VERSION,
    userId: value.userId,
    organizationId: value.organizationId,
    cachedAt: value.cachedAt,
    home: value.home ?? null,
    roster: value.roster ?? null,
    shifts: Array.isArray(value.shifts) ? value.shifts : [],
    shiftDetails:
      value.shiftDetails && typeof value.shiftDetails === "object" ? value.shiftDetails : {},
    notifications: value.notifications ?? null,
  }
}

export function cacheBelongsToStaff(
  cache: StaffOfflineCache,
  userId: string,
  organizationId: string,
) {
  return cache.userId === userId && cache.organizationId === organizationId
}

export function staffCacheForIdentity(
  cache: StaffOfflineCache | null,
  userId: string,
  organizationId: string,
): StaffOfflineCache | null {
  if (!cache || !cacheBelongsToStaff(cache, userId, organizationId)) {
    return null
  }

  return cache
}

export function mergeStaffOfflineCache(
  current: StaffOfflineCache,
  patch: Partial<
    Pick<StaffOfflineCache, "home" | "roster" | "shifts" | "shiftDetails" | "notifications">
  > & { cachedAt: string },
): StaffOfflineCache {
  return {
    ...current,
    cachedAt: patch.cachedAt,
    home: patch.home !== undefined ? patch.home : current.home,
    roster: patch.roster !== undefined ? patch.roster : current.roster,
    shifts: patch.shifts !== undefined ? patch.shifts : current.shifts,
    shiftDetails:
      patch.shiftDetails !== undefined
        ? { ...current.shiftDetails, ...patch.shiftDetails }
        : current.shiftDetails,
    notifications: patch.notifications !== undefined ? patch.notifications : current.notifications,
  }
}

export function assertOnlineForMutation(online: boolean) {
  if (!online) {
    return { ok: false as const, message: OFFLINE_MUTATION_MESSAGE }
  }

  return { ok: true as const }
}

export const STAFF_CACHE_BOUNDARIES = {
  allowed: [
    "own published roster assignments",
    "own upcoming shifts",
    "own shift details",
    "minimal published roster metadata",
    "own in-app notifications",
  ],
  denied: [
    "other staff schedules",
    "HR records",
    "other staff leave",
    "audit logs",
    "scheduling policies",
    "staffing requirements",
    "administrative roster drafts",
  ],
  mutationsNeverQueued: [
    "CREATE LEAVE",
    "CANCEL LEAVE",
    "REQUEST SWAP",
    "CANCEL SWAP",
    "EDIT ROSTER",
    "PUBLISH ROSTER",
    "AMEND ROSTER",
    "CLOCK IN",
    "CLOCK OUT",
    "CORRECT ATTENDANCE",
  ],
} as const
