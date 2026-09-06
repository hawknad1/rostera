import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { createAssignment } from "@/modules/rosters/services/assignments"
import {
  AUTH_STAFF,
  insertAssignment,
  insertPublishedRoster,
  seedStaffApp,
} from "@/modules/staff-app/__tests__/helpers"
import { requireMutableStaff } from "@/modules/staff-app/services/identity"
import { listStaffSwapOptions } from "@/modules/staff-app/services/swaps"
import { createSwap } from "@/modules/shift-swaps/services/create-swap"

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
    date: "2026-09-11",
  })
  getAuthUser.mockResolvedValue({ id: AUTH_STAFF })
})

describe("staff swap self-service", () => {
  it("allows a staff member to request a swap from their own published assignment", async () => {
    const created = await createSwap({
      sourceAssignmentId: "assign-ama",
      targetAssignmentId: "assign-kofi",
    })

    expect(created.requesterStaffId).toBe("staff-ama")
    expect(created.sourceAssignmentId).toBe("assign-ama")
    expect(created.status).toBe("PENDING")
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-ama")?.staffId).toBe(
      "staff-ama",
    )
  })

  it("rejects using another staff member's source assignment", async () => {
    await expect(
      createSwap({
        sourceAssignmentId: "assign-kofi",
        targetAssignmentId: "assign-ama",
      }),
    ).rejects.toMatchObject({ code: "SWAP_NOT_YOURS" })
  })

  it("does not let STAFF mutate assignments directly", async () => {
    await expect(
      createAssignment({
        rosterId: "roster-v1",
        staffId: "staff-ama",
        shiftTypeId: "shift-day",
        date: "2026-09-12",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("hides draft-amendment assignments from staff swap options", async () => {
    insertPublishedRoster({
      id: "roster-v2",
      seriesId: "series-ed",
      versionNumber: 2,
      status: "DRAFT",
    })
    insertAssignment({
      id: "assign-ama-draft",
      staffId: "staff-ama",
      rosterId: "roster-v2",
      date: "2026-09-13",
    })

    const options = await listStaffSwapOptions()
    expect(options.ownAssignments.map((row) => row.id)).toEqual(["assign-ama"])
  })

  it("requires an active linked staff profile before mutating", async () => {
    memory.tables.StaffProfile.find((row) => row.id === "staff-ama")!.employmentStatus = "TERMINATED"
    await expect(requireMutableStaff()).rejects.toMatchObject({ code: "STAFF_TERMINATED" })
  })
})
