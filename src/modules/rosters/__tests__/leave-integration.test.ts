import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { approveLeave, cancelLeave, createLeave, rejectLeave } from "@/modules/leave/services/leave"
import { createAssignment } from "@/modules/rosters/services/assignments"
import {
  publishRoster,
  submitRosterForReview,
} from "@/modules/rosters/services/lifecycle"
import { createRoster, getRoster } from "@/modules/rosters/services/rosters"
import { validateRoster } from "@/modules/rosters/services/validation"

const AUTH_A = "supabase-auth-user-a"
const AUTH_B = "supabase-auth-user-b"
const USER_A = "user-a"
const USER_B = "user-b"
const ORG_A = "org-a"
const ORG_B = "org-b"
const ROLE_A = "role-a"
const ROLE_B = "role-b"

const PERMISSION_IDS = {
  rosterView: "perm-roster-view",
  rosterCreate: "perm-roster-create",
  rosterEdit: "perm-roster-edit",
  rosterReview: "perm-roster-review",
  rosterPublish: "perm-roster-publish",
  leaveView: "perm-leave-view",
  leaveCreate: "perm-leave-create",
  leaveApprove: "perm-leave-approve",
  leaveReject: "perm-leave-reject",
} as const

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

function authenticateAsA() {
  getAuthUser.mockResolvedValue({ id: AUTH_A })
}

function authenticateAsB() {
  getAuthUser.mockResolvedValue({ id: AUTH_B })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function seed() {
  memory.insert("Permission", { id: PERMISSION_IDS.rosterView, key: permissions.rosterView })
  memory.insert("Permission", { id: PERMISSION_IDS.rosterCreate, key: permissions.rosterCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.rosterEdit, key: permissions.rosterEdit })
  memory.insert("Permission", { id: PERMISSION_IDS.rosterReview, key: permissions.rosterReview })
  memory.insert("Permission", { id: PERMISSION_IDS.rosterPublish, key: permissions.rosterPublish })
  memory.insert("Permission", { id: PERMISSION_IDS.leaveView, key: permissions.leaveView })
  memory.insert("Permission", { id: PERMISSION_IDS.leaveCreate, key: permissions.leaveCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.leaveApprove, key: permissions.leaveApprove })
  memory.insert("Permission", { id: PERMISSION_IDS.leaveReject, key: permissions.leaveReject })

  memory.insert("Organization", {
    id: ORG_A,
    name: "Hospital A",
    slug: "hospital-a",
    timezone: "Africa/Accra",
  })
  memory.insert("Organization", {
    id: ORG_B,
    name: "Hospital B",
    slug: "hospital-b",
    timezone: "Africa/Accra",
  })
  memory.insert("User", { id: USER_A, authProviderId: AUTH_A, email: "a@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })
  memory.insert("Role", { id: ROLE_A, organizationId: ORG_A, name: "SUPER_ADMIN" })
  memory.insert("Role", { id: ROLE_B, organizationId: ORG_B, name: "SUPER_ADMIN" })

  for (const roleId of [ROLE_A, ROLE_B]) {
    for (const permissionId of Object.values(PERMISSION_IDS)) {
      grant(roleId, permissionId)
    }
  }

  memory.insert("OrganizationMember", {
    id: "membership-a",
    organizationId: ORG_A,
    userId: USER_A,
    roleId: ROLE_A,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-b",
    organizationId: ORG_B,
    userId: USER_B,
    roleId: ROLE_B,
    status: "ACTIVE",
  })
  memory.insert("Profession", {
    id: "prof-nurse",
    organizationId: null,
    name: "Nurse",
    isActive: true,
  })
  memory.insert("Department", { id: "dept-a", organizationId: ORG_A, name: "Emergency" })
  memory.insert("Department", { id: "dept-b", organizationId: ORG_B, name: "Emergency" })
  memory.insert("StaffProfile", {
    id: "staff-ama",
    organizationId: ORG_A,
    staffNumber: "NUR-001",
    firstName: "Ama",
    lastName: "Mensah",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-kofi",
    organizationId: ORG_A,
    staffNumber: "NUR-002",
    firstName: "Kofi",
    lastName: "Owusu",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-b",
    organizationId: ORG_B,
    staffNumber: "NUR-001",
    firstName: "Abena",
    lastName: "Sarpong",
    professionId: "prof-nurse",
    departmentId: "dept-b",
    employmentStatus: "ACTIVE",
  })
  memory.insert("ShiftType", {
    id: "shift-day",
    organizationId: ORG_A,
    name: "Day",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-night",
    organizationId: ORG_A,
    name: "Night",
    startTime: "22:00",
    endTime: "06:00",
    isOvernight: true,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-day-b",
    organizationId: ORG_B,
    name: "Day",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })
}

async function draftRoster() {
  return createRoster({
    name: "September Emergency",
    departmentId: "dept-a",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  })
}

beforeEach(() => {
  memory.reset()
  seed()
  authenticateAsA()
})

describe("assignment creation with leave", () => {
  it("blocks a new assignment on an approved leave date", async () => {
    const roster = await draftRoster()
    const leave = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })
    await approveLeave(String(leave.id))

    await expect(
      createAssignment({
        rosterId: roster.id,
        staffId: "staff-ama",
        shiftTypeId: "shift-day",
        date: "2026-09-11",
      }),
    ).rejects.toMatchObject({ code: "LEAVE_CONFLICT" })
  })

  it("does not block assignment when leave is pending, rejected, or cancelled", async () => {
    const roster = await draftRoster()
    const pending = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })

    await expect(
      createAssignment({
        rosterId: roster.id,
        staffId: "staff-ama",
        shiftTypeId: "shift-day",
        date: "2026-09-11",
      }),
    ).resolves.toMatchObject({ assignment: expect.objectContaining({ date: "2026-09-11" }) })

    await memory.db.orm.public.ShiftAssignment.where({
      rosterId: roster.id,
      staffId: "staff-ama",
      date: "2026-09-11",
    }).delete()

    await rejectLeave(String(pending.id))
    await expect(
      createAssignment({
        rosterId: roster.id,
        staffId: "staff-ama",
        shiftTypeId: "shift-day",
        date: "2026-09-11",
      }),
    ).resolves.toBeTruthy()

    await memory.db.orm.public.ShiftAssignment.where({
      rosterId: roster.id,
      staffId: "staff-ama",
      date: "2026-09-11",
    }).delete()

    const cancelled = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })
    await cancelLeave(String(cancelled.id))
    await expect(
      createAssignment({
        rosterId: roster.id,
        staffId: "staff-ama",
        shiftTypeId: "shift-day",
        date: "2026-09-11",
      }),
    ).resolves.toBeTruthy()
  })

  it("allows assignments immediately before and after approved leave", async () => {
    const roster = await draftRoster()
    const leave = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })
    await approveLeave(String(leave.id))

    await expect(
      createAssignment({
        rosterId: roster.id,
        staffId: "staff-ama",
        shiftTypeId: "shift-day",
        date: "2026-09-09",
      }),
    ).resolves.toBeTruthy()
    await expect(
      createAssignment({
        rosterId: roster.id,
        staffId: "staff-ama",
        shiftTypeId: "shift-day",
        date: "2026-09-13",
      }),
    ).resolves.toBeTruthy()
  })

  it("blocks overnight assignments by assignment date, not end date", async () => {
    const roster = await draftRoster()
    const leave = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-10",
    })
    await approveLeave(String(leave.id))

    await expect(
      createAssignment({
        rosterId: roster.id,
        staffId: "staff-ama",
        shiftTypeId: "shift-night",
        date: "2026-09-10",
      }),
    ).rejects.toMatchObject({ code: "LEAVE_CONFLICT" })

    await expect(
      createAssignment({
        rosterId: roster.id,
        staffId: "staff-ama",
        shiftTypeId: "shift-night",
        date: "2026-09-09",
      }),
    ).resolves.toBeTruthy()
  })

  it("still rejects overlapping assignments independently of leave", async () => {
    const roster = await draftRoster()
    await createAssignment({
      rosterId: roster.id,
      staffId: "staff-ama",
      shiftTypeId: "shift-day",
      date: "2026-09-03",
    })

    await expect(
      createAssignment({
        rosterId: roster.id,
        staffId: "staff-ama",
        shiftTypeId: "shift-day",
        date: "2026-09-03",
      }),
    ).rejects.toMatchObject({ code: "ASSIGNMENT_DUPLICATE" })
  })
})

describe("roster validation and publishing with leave", () => {
  it("reports approved leave as a blocker and ignores other statuses", async () => {
    const roster = await draftRoster()
    await createAssignment({
      rosterId: roster.id,
      staffId: "staff-ama",
      shiftTypeId: "shift-day",
      date: "2026-09-11",
    })

    const pending = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })
    const whilePending = await validateRoster(roster.id)
    expect(whilePending.blockers.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual(
      [],
    )

    await approveLeave(String(pending.id))
    const whileApproved = await validateRoster(roster.id)
    expect(whileApproved.valid).toBe(false)
    expect(whileApproved.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "LEAVE_CONFLICT" })]),
    )

    await cancelLeave(String(pending.id))
    const whileCancelled = await validateRoster(roster.id)
    expect(whileCancelled.blockers.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual(
      [],
    )
  })

  it("returns multiple leave conflicts", async () => {
    const roster = await draftRoster()
    await createAssignment({
      rosterId: roster.id,
      staffId: "staff-ama",
      shiftTypeId: "shift-day",
      date: "2026-09-11",
    })
    await createAssignment({
      rosterId: roster.id,
      staffId: "staff-kofi",
      shiftTypeId: "shift-day",
      date: "2026-09-12",
    })

    const ama = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-11",
      endDate: "2026-09-11",
    })
    const kofi = await createLeave({
      staffId: "staff-kofi",
      leaveType: "SICK",
      startDate: "2026-09-12",
      endDate: "2026-09-12",
    })
    await approveLeave(String(ama.id))
    await approveLeave(String(kofi.id))

    const result = await validateRoster(roster.id)
    expect(result.blockers.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toHaveLength(2)
  })

  it("does not load another organization's leave into validation", async () => {
    const roster = await draftRoster()
    await createAssignment({
      rosterId: roster.id,
      staffId: "staff-ama",
      shiftTypeId: "shift-day",
      date: "2026-09-11",
    })

    authenticateAsB()
    const foreign = await createLeave({
      staffId: "staff-b",
      leaveType: "ANNUAL",
      startDate: "2026-09-11",
      endDate: "2026-09-11",
    })
    await approveLeave(String(foreign.id))

    authenticateAsA()
    memory.insert("LeaveRequest", {
      id: "spoofed-leave",
      organizationId: ORG_B,
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-11",
      endDate: "2026-09-11",
      status: "APPROVED",
      requestedByUserId: USER_B,
    })

    const result = await validateRoster(roster.id)
    expect(result.blockers.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual([])
  })

  it("cannot publish a roster with an approved-leave conflict", async () => {
    const roster = await draftRoster()
    await createAssignment({
      rosterId: roster.id,
      staffId: "staff-ama",
      shiftTypeId: "shift-day",
      date: "2026-09-11",
    })
    const leave = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-11",
      endDate: "2026-09-11",
    })
    await approveLeave(String(leave.id))

    await expect(submitRosterForReview(roster.id)).rejects.toMatchObject({
      code: "ROSTER_HAS_BLOCKING_CONFLICTS",
    })

    await cancelLeave(String(leave.id))
    await submitRosterForReview(roster.id)
    await publishRoster(roster.id)
    const published = await getRoster(roster.id)
    expect(published.status).toBe("PUBLISHED")
  })

  it("does not mutate published assignments when leave is later approved or cancelled", async () => {
    const roster = await draftRoster()
    const { assignment } = await createAssignment({
      rosterId: roster.id,
      staffId: "staff-ama",
      shiftTypeId: "shift-day",
      date: "2026-09-11",
    })
    await submitRosterForReview(roster.id)
    await publishRoster(roster.id)

    const leave = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })
    await approveLeave(String(leave.id))

    const stillPublished = await getRoster(roster.id)
    expect(stillPublished.status).toBe("PUBLISHED")
    expect(stillPublished.assignmentCount).toBe(1)
    expect(
      memory.tables.ShiftAssignment.filter(
        (row) => row.rosterId === roster.id && row.id === assignment.id,
      ),
    ).toHaveLength(1)

    await cancelLeave(String(leave.id))
    const afterCancel = await getRoster(roster.id)
    expect(afterCancel.status).toBe("PUBLISHED")
    expect(afterCancel.assignmentCount).toBe(1)
    expect(
      memory.tables.ShiftAssignment.filter(
        (row) => row.rosterId === roster.id && row.id === assignment.id,
      ),
    ).toHaveLength(1)
  })
})
