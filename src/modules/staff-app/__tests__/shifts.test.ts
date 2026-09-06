import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import {
  AUTH_STAFF,
  AUTH_STAFF_B,
  AUTH_B,
  insertAssignment,
  insertPublishedRoster,
  seedStaffApp,
} from "@/modules/staff-app/__tests__/helpers"
import { getStaffShift, listStaffShifts } from "@/modules/staff-app/services/shifts"

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
  insertPublishedRoster()
  insertAssignment({ id: "assign-ama", staffId: "staff-ama", rosterId: "roster-v1", date: "2026-09-10" })
  insertAssignment({
    id: "assign-kofi",
    staffId: "staff-kofi",
    rosterId: "roster-v1",
    date: "2026-09-10",
    overnight: true,
  })
  insertPublishedRoster({
    id: "roster-b",
    organizationId: "org-b",
    departmentId: "dept-b",
    seriesId: "series-b",
  })
  insertAssignment({
    id: "assign-b",
    staffId: "staff-b",
    rosterId: "roster-b",
    date: "2026-09-10",
    organizationId: "org-b",
    departmentId: "dept-b",
    shiftTypeId: "shift-day-b",
  })
})

describe("staff shift access", () => {
  it("allows a staff member to view their own published assignment", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_STAFF })
    const shift = await getStaffShift("assign-ama")

    expect(shift.id).toBe("assign-ama")
    expect(shift.departmentName).toBe("Emergency")
    expect(shift.rosterVersion).toBe(1)
    expect(shift.isOvernight).toBe(false)
  })

  it("rejects another staff member's assignment detail", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_STAFF })
    await expect(getStaffShift("assign-kofi")).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("rejects a cross-tenant assignment", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_STAFF })
    await expect(getStaffShift("assign-b")).rejects.toMatchObject({ code: "NOT_FOUND" })

    getAuthUser.mockResolvedValue({ id: AUTH_B })
    await expect(getStaffShift("assign-ama")).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("lists only the authenticated staff member's published assignments", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_STAFF_B })
    const result = await listStaffShifts()
    expect(result.assignments.map((row) => row.id)).toEqual(["assign-kofi"])
    expect(result.assignments[0]?.isOvernight).toBe(true)
  })
})
