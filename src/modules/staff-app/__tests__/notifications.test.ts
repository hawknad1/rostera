import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import {
  listNotifications,
  getUnreadNotificationCount,
} from "@/modules/notifications/services/notifications"
import {
  AUTH_STAFF,
  AUTH_STAFF_B,
  ORG_A,
  USER_STAFF,
  USER_STAFF_B,
  seedStaffApp,
} from "@/modules/staff-app/__tests__/helpers"
import { staffNotificationHref } from "@/modules/staff-app/deep-links"

const { getAuthUser } = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
}))

vi.mock("@/prisma/db", async () => {
  const { memory: testDb } = await import("@/lib/auth/__tests__/in-memory-orm")
  return { db: testDb.db }
})

vi.mock("@/lib/auth/get-auth-user", () => ({
  getAuthUser,
}))

beforeEach(() => {
  memory.reset()
  seedStaffApp()
  memory.insert("Notification", {
    id: "n-ama",
    organizationId: ORG_A,
    recipientUserId: USER_STAFF,
    type: "ROSTER_PUBLISHED",
    title: "Roster published",
    body: "September Emergency is published.",
    entityType: "ROSTER",
    entityId: "roster-v1",
    eventId: "evt-ama",
    readAt: null,
  })
  memory.insert("Notification", {
    id: "n-kofi",
    organizationId: ORG_A,
    recipientUserId: USER_STAFF_B,
    type: "LEAVE_APPROVED",
    title: "Leave approved",
    body: "Your leave was approved.",
    entityType: "LEAVE_REQUEST",
    entityId: "leave-kofi",
    eventId: "evt-kofi",
    readAt: null,
  })
})

describe("staff notifications", () => {
  it("returns only the authenticated user's notifications", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_STAFF })
    const result = await listNotifications()

    expect(result.items.map((row) => row.id)).toEqual(["n-ama"])
    expect(result.unreadCount).toBe(1)
    await expect(getUnreadNotificationCount()).resolves.toBe(1)
  })

  it("does not expose another user's inbox", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_STAFF_B })
    const result = await listNotifications()

    expect(result.items.map((row) => row.id)).toEqual(["n-kofi"])
    expect(result.items.some((row) => row.recipientUserId === USER_STAFF)).toBe(false)
  })

  it("maps staff notification deep links into /me", () => {
    expect(staffNotificationHref("LEAVE_REQUEST", "leave-1")).toBe("/me/leave/leave-1")
    expect(staffNotificationHref("SHIFT_SWAP", "swap-1")).toBe("/me/swaps/swap-1")
    expect(staffNotificationHref("ROSTER", "roster-1")).toBe("/me/roster")
    expect(staffNotificationHref("ATTENDANCE", "att-1")).toBe("/me/attendance")
  })
})
