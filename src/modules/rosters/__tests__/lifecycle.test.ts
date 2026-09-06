import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { assignmentDateTimeWindow } from "@/lib/dates/assignment-window"
import { permissions } from "@/lib/permissions/permissions"
import {
  createAssignment,
  deleteAssignment,
} from "@/modules/rosters/services/assignments"
import {
  deleteRoster,
  publishRoster,
  returnRosterToDraft,
  submitRosterForReview,
} from "@/modules/rosters/services/lifecycle"
import { createRoster, getRoster, updateRoster } from "@/modules/rosters/services/rosters"
import { validateRoster } from "@/modules/rosters/services/validation"

const AUTH_USER_A = "supabase-auth-user-a"
const AUTH_USER_B = "supabase-auth-user-b"
const USER_A_ID = "user-a"
const USER_B_ID = "user-b"
const ORG_A_ID = "org-a"
const ORG_B_ID = "org-b"
const ROLE_A_ID = "role-a"
const ROLE_B_ID = "role-b"

const PERMISSION_IDS = {
  view: "perm-roster-view",
  create: "perm-roster-create",
  edit: "perm-roster-edit",
  review: "perm-roster-review",
  publish: "perm-roster-publish",
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
  getAuthUser.mockResolvedValue({ id: AUTH_USER_A })
}

function authenticateAsB() {
  getAuthUser.mockResolvedValue({ id: AUTH_USER_B })
}

function seedPermissionCatalog() {
  memory.insert("Permission", { id: PERMISSION_IDS.view, key: permissions.rosterView })
  memory.insert("Permission", { id: PERMISSION_IDS.create, key: permissions.rosterCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.edit, key: permissions.rosterEdit })
  memory.insert("Permission", { id: PERMISSION_IDS.review, key: permissions.rosterReview })
  memory.insert("Permission", { id: PERMISSION_IDS.publish, key: permissions.rosterPublish })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function grantManager(roleId: string) {
  grant(roleId, PERMISSION_IDS.view)
  grant(roleId, PERMISSION_IDS.create)
  grant(roleId, PERMISSION_IDS.edit)
  grant(roleId, PERMISSION_IDS.review)
  grant(roleId, PERMISSION_IDS.publish)
}

function seedHospitals() {
  memory.insert("Organization", {
    id: ORG_A_ID,
    name: "Hospital A",
    slug: "hospital-a",
    timezone: "Africa/Accra",
  })
  memory.insert("Organization", {
    id: ORG_B_ID,
    name: "Hospital B",
    slug: "hospital-b",
    timezone: "Africa/Accra",
  })
  memory.insert("User", { id: USER_A_ID, authProviderId: AUTH_USER_A, email: "a@test.local" })
  memory.insert("User", { id: USER_B_ID, authProviderId: AUTH_USER_B, email: "b@test.local" })
  memory.insert("Role", { id: ROLE_A_ID, organizationId: ORG_A_ID, name: "ROSTER_MANAGER" })
  memory.insert("Role", { id: ROLE_B_ID, organizationId: ORG_B_ID, name: "ROSTER_MANAGER" })
  memory.insert("OrganizationMember", {
    id: "membership-a",
    organizationId: ORG_A_ID,
    userId: USER_A_ID,
    roleId: ROLE_A_ID,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-b",
    organizationId: ORG_B_ID,
    userId: USER_B_ID,
    roleId: ROLE_B_ID,
    status: "ACTIVE",
  })
  memory.insert("Profession", {
    id: "prof-nurse",
    organizationId: null,
    name: "Nurse",
    isActive: true,
  })
  memory.insert("Department", {
    id: "dept-a",
    organizationId: ORG_A_ID,
    name: "Emergency",
  })
  memory.insert("Department", {
    id: "dept-b",
    organizationId: ORG_B_ID,
    name: "Emergency",
  })
  memory.insert("StaffProfile", {
    id: "staff-ama",
    organizationId: ORG_A_ID,
    staffNumber: "NUR-001",
    firstName: "Ama",
    lastName: "Mensah",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-b",
    organizationId: ORG_B_ID,
    staffNumber: "NUR-001",
    firstName: "Efua",
    lastName: "Boateng",
    professionId: "prof-nurse",
    departmentId: "dept-b",
    employmentStatus: "ACTIVE",
  })
  memory.insert("ShiftType", {
    id: "shift-day",
    organizationId: ORG_A_ID,
    name: "Day",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-late",
    organizationId: ORG_A_ID,
    name: "Late",
    startTime: "14:00",
    endTime: "22:00",
    isOvernight: false,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-b",
    organizationId: ORG_B_ID,
    name: "Day",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })
}

async function createDayRoster(departmentId = "dept-a") {
  return createRoster({
    name: "3 September — Emergency",
    departmentId,
    startDate: "2026-09-03",
    endDate: "2026-09-03",
  })
}

describe("roster lifecycle", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seedPermissionCatalog()
    seedHospitals()
    grantManager(ROLE_A_ID)
    grantManager(ROLE_B_ID)
    authenticateAsA()
  })

  it("submits a draft roster for review when there are no blockers", async () => {
    memory.insert("StaffingRequirement", {
      id: "req-day-nurse",
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      requiredCount: 2,
    })
    const roster = await createDayRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    const submitted = await submitRosterForReview(roster.id)
    expect(submitted.status).toBe("IN_REVIEW")
  })

  it("returns an in-review roster to draft", async () => {
    const roster = await createDayRoster()
    await submitRosterForReview(roster.id)
    const returned = await returnRosterToDraft(roster.id)
    expect(returned.status).toBe("DRAFT")
  })

  it("publishes an in-review roster with no blockers", async () => {
    const roster = await createDayRoster()
    await submitRosterForReview(roster.id)
    const published = await publishRoster(roster.id)
    expect(published.status).toBe("PUBLISHED")
  })

  it("rejects submit and publish when blockers exist", async () => {
    const roster = await createDayRoster()
    const day = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
      isOvernight: false,
      timeZone: "Africa/Accra",
    })
    const late = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "14:00",
      endTime: "22:00",
      isOvernight: false,
      timeZone: "Africa/Accra",
    })
    memory.insert("ShiftAssignment", {
      id: "a-day",
      organizationId: ORG_A_ID,
      rosterId: roster.id,
      departmentId: "dept-a",
      staffId: "staff-ama",
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      date: "2026-09-03",
      shiftStartTime: "08:00",
      shiftEndTime: "16:00",
      isOvernight: false,
      startDateTime: day.start,
      endDateTime: day.end,
    })
    memory.insert("ShiftAssignment", {
      id: "a-late",
      organizationId: ORG_A_ID,
      rosterId: roster.id,
      departmentId: "dept-a",
      staffId: "staff-ama",
      shiftTypeId: "shift-late",
      professionId: "prof-nurse",
      date: "2026-09-03",
      shiftStartTime: "14:00",
      shiftEndTime: "22:00",
      isOvernight: false,
      startDateTime: late.start,
      endDateTime: late.end,
    })

    await expect(submitRosterForReview(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_HAS_BLOCKING_CONFLICTS",
    })

    const afterSubmit = await getRoster(roster.id)
    expect(afterSubmit.status).toBe("DRAFT")

    memory.tables.Roster.find((row) => row.id === roster.id)!.status = "IN_REVIEW"

    await expect(publishRoster(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_HAS_BLOCKING_CONFLICTS",
    })

    const afterPublish = await getRoster(roster.id)
    expect(afterPublish.status).toBe("IN_REVIEW")
  })

  it("rejects invalid transitions including republish", async () => {
    const roster = await createDayRoster()

    await expect(publishRoster(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_PUBLISHABLE",
    })

    await submitRosterForReview(roster.id)
    await publishRoster(roster.id)

    await expect(returnRosterToDraft(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_ALREADY_PUBLISHED",
    })
    await expect(submitRosterForReview(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_ALREADY_PUBLISHED",
    })
    await expect(publishRoster(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_ALREADY_PUBLISHED",
    })
  })

  it("does not publish another organization's roster", async () => {
    authenticateAsB()
    const hospitalB = await createDayRoster("dept-b")
    await submitRosterForReview(hospitalB.id)

    authenticateAsA()
    await expect(publishRoster(hospitalB.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_FOUND",
    })
    await expect(getRoster(hospitalB.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_FOUND",
    })
  })

  it("requires roster.review to submit and roster.publish to publish", async () => {
    const roster = await createDayRoster()

    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    grant(ROLE_A_ID, PERMISSION_IDS.create)
    grant(ROLE_A_ID, PERMISSION_IDS.edit)
    authenticateAsA()

    await expect(submitRosterForReview(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "FORBIDDEN",
    })

    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    grant(ROLE_A_ID, PERMISSION_IDS.review)
    authenticateAsA()
    memory.tables.Roster.push({
      id: roster.id,
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      name: "3 September — Emergency",
      startDate: "2026-09-03",
      endDate: "2026-09-03",
      status: "IN_REVIEW",
      createdByUserId: USER_A_ID,
    })

    await expect(publishRoster(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "FORBIDDEN",
    })
  })

  it("does not allow assignment or metadata changes once the roster is not a draft", async () => {
    const roster = await createDayRoster()
    const { assignment } = await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    await submitRosterForReview(roster.id)

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-late",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_DRAFT",
    })
    await expect(deleteAssignment({ id: assignment.id })).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_DRAFT",
    })
    await expect(
      updateRoster({
        id: roster.id,
        name: "Changed",
        startDate: "2026-09-03",
        endDate: "2026-09-03",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_DRAFT",
    })

    await publishRoster(roster.id)

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-late",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_DRAFT",
    })
    await expect(deleteAssignment({ id: assignment.id })).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_DRAFT",
    })
    await expect(
      updateRoster({
        id: roster.id,
        name: "Changed",
        startDate: "2026-09-03",
        endDate: "2026-09-03",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_DRAFT",
    })
    await expect(deleteRoster(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_ALREADY_PUBLISHED",
    })
  })

  it("deletes a draft roster and refuses in-review deletion", async () => {
    const roster = await createDayRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })
    await deleteRoster(roster.id)
    await expect(getRoster(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_FOUND",
    })

    const reviewable = await createDayRoster()
    await submitRosterForReview(reviewable.id)
    await expect(deleteRoster(reviewable.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_DRAFT",
    })
  })

  it("re-validates on publish so a stale validation result cannot bypass a blocker", async () => {
    const roster = await createDayRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })
    await submitRosterForReview(roster.id)

    const previous = await validateRoster(roster.id)
    expect(previous.valid).toBe(true)

    const late = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "14:00",
      endTime: "22:00",
      isOvernight: false,
      timeZone: "Africa/Accra",
    })
    memory.insert("ShiftAssignment", {
      id: "stale-overlap",
      organizationId: ORG_A_ID,
      rosterId: roster.id,
      departmentId: "dept-a",
      staffId: "staff-ama",
      shiftTypeId: "shift-late",
      professionId: "prof-nurse",
      date: "2026-09-03",
      shiftStartTime: "14:00",
      shiftEndTime: "22:00",
      isOvernight: false,
      startDateTime: late.start,
      endDateTime: late.end,
    })

    await expect(publishRoster(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_HAS_BLOCKING_CONFLICTS",
    })

    const stillInReview = await getRoster(roster.id)
    expect(stillInReview.status).toBe("IN_REVIEW")
  })
})
