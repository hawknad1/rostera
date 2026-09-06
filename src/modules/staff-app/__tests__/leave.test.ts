import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { createLeave } from "@/modules/leave/services/leave"
import {
  AUTH_STAFF,
  AUTH_TERMINATED,
  AUTH_UNLINKED,
  USER_STAFF,
  seedStaffApp,
} from "@/modules/staff-app/__tests__/helpers"
import { requireMutableStaff } from "@/modules/staff-app/services/identity"

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
})

describe("staff leave self-service", () => {
  it("creates leave for the linked staff profile when no staffId is supplied", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_STAFF })
    const leave = await createLeave({
      leaveType: "SICK",
      startDate: "2026-09-16",
      endDate: "2026-09-16",
    })

    expect(leave.staffId).toBe("staff-ama")
    expect(leave.requestedByUserId).toBe(USER_STAFF)
    expect(leave.organizationId).toBe("org-a")
    expect(leave.status).toBe("PENDING")
  })

  it("rejects creating leave for another staff member", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_STAFF })
    await expect(
      createLeave({
        staffId: "staff-kofi",
        leaveType: "SICK",
        startDate: "2026-09-16",
        endDate: "2026-09-16",
      }),
    ).rejects.toMatchObject({ code: "LEAVE_NOT_YOURS" })
  })

  it("rejects leave from an unlinked user", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_UNLINKED })
    await expect(
      createLeave({
        leaveType: "ANNUAL",
        startDate: "2026-09-16",
        endDate: "2026-09-16",
      }),
    ).rejects.toMatchObject({ code: "STAFF_NOT_LINKED" })
  })

  it("rejects leave from terminated staff", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_TERMINATED })
    await expect(requireMutableStaff()).rejects.toMatchObject({ code: "STAFF_TERMINATED" })
    await expect(
      createLeave({
        leaveType: "ANNUAL",
        startDate: "2026-09-16",
        endDate: "2026-09-16",
      }),
    ).rejects.toMatchObject({ code: "STAFF_NOT_ACTIVE" })
  })
})
