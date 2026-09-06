import { describe, expect, it } from "vitest"

import {
  assertOnlineForMutation,
  cacheBelongsToStaff,
  emptyStaffOfflineCache,
  mergeStaffOfflineCache,
  parseStaffOfflineCache,
  staffCacheForIdentity,
  staffCacheStorageKey,
  STAFF_CACHE_BOUNDARIES,
  OFFLINE_MUTATION_MESSAGE,
} from "@/modules/staff-app/cache"

describe("staff offline cache", () => {
  it("rejects malformed or cross-user cache payloads", () => {
    expect(parseStaffOfflineCache(null)).toBeNull()
    expect(parseStaffOfflineCache({ version: 2, userId: "u", organizationId: "o" })).toBeNull()
    expect(
      cacheBelongsToStaff(
        emptyStaffOfflineCache({ userId: "user-a", organizationId: "org-a" }),
        "user-b",
        "org-a",
      ),
    ).toBe(false)
  })

  it("merges only staff-owned roster, shift, and notification slices", () => {
    const base = emptyStaffOfflineCache({ userId: "user-a", organizationId: "org-a" })
    const merged = mergeStaffOfflineCache(base, {
      cachedAt: "2026-09-06T10:42:00.000Z",
      shifts: [
        {
          id: "a1",
          date: "2026-09-10",
          dateLabel: "10 September 2026",
          weekdayLabel: "Thu",
          relativeDayLabel: "Tomorrow",
          shiftTypeName: "Day Duty",
          startTime: "08:00",
          endTime: "16:00",
          timeLabel: "08:00–16:00",
          isOvernight: false,
          departmentId: "dept-a",
          departmentName: "Emergency",
          rosterId: "roster-v1",
          rosterName: "September Emergency",
          rosterVersion: 1,
          rosterStatus: "PUBLISHED",
          seriesId: "series-ed",
          startDateTime: "2026-09-10T08:00:00Z",
          endDateTime: "2026-09-10T16:00:00Z",
        },
      ],
    })

    expect(merged.cachedAt).toBe("2026-09-06T10:42:00.000Z")
    expect(merged.shifts).toHaveLength(1)
    expect(staffCacheStorageKey("user-a", "org-a")).toContain("user-a")
    expect(STAFF_CACHE_BOUNDARIES.denied).toContain("audit logs")
    expect(STAFF_CACHE_BOUNDARIES.mutationsNeverQueued).toContain("CREATE LEAVE")
    expect(STAFF_CACHE_BOUNDARIES.mutationsNeverQueued).toContain("CLOCK IN")
    expect(STAFF_CACHE_BOUNDARIES.mutationsNeverQueued).toContain("CLOCK OUT")
  })

  it("blocks offline mutations without queuing them", () => {
    expect(assertOnlineForMutation(false)).toEqual({
      ok: false,
      message: OFFLINE_MUTATION_MESSAGE,
    })
    expect(assertOnlineForMutation(true)).toEqual({ ok: true })
  })

  it("keeps staff local cache scoped to user and organization", () => {
    const userA = emptyStaffOfflineCache({ userId: "user-a", organizationId: "org-a" })
    const userBLookup = staffCacheForIdentity(userA, "user-b", "org-a")
    const otherOrg = staffCacheForIdentity(userA, "user-a", "org-b")

    expect(staffCacheStorageKey("user-a", "org-a")).not.toBe(staffCacheStorageKey("user-b", "org-a"))
    expect(userBLookup).toBeNull()
    expect(otherOrg).toBeNull()
    expect(staffCacheForIdentity(userA, "user-a", "org-a")).toEqual(userA)
    expect(cacheBelongsToStaff(userA, "user-a", "org-a")).toBe(true)
  })
})
