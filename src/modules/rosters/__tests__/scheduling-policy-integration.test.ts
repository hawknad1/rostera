import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createAssignmentInputSchema } from "@/modules/rosters/schemas/assignment"
import { createAssignment } from "@/modules/rosters/services/assignments"
import { publishRoster, submitRosterForReview } from "@/modules/rosters/services/lifecycle"
import { createRoster, getRoster } from "@/modules/rosters/services/rosters"
import { validateRoster } from "@/modules/rosters/services/validation"
import { DISABLED_SCHEDULING_POLICY } from "@/modules/scheduling/types/scheduling-policy"

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
    id: "shift-night",
    organizationId: ORG_A_ID,
    name: "Night",
    startTime: "22:00",
    endTime: "06:00",
    isOvernight: true,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-overlap",
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

function setPolicy(
  organizationId: string,
  values: Partial<typeof DISABLED_SCHEDULING_POLICY> = {},
) {
  const existing = memory.tables.OrganizationSchedulingPolicy.find(
    (row) => row.organizationId === organizationId,
  )
  const next = {
    ...DISABLED_SCHEDULING_POLICY,
    ...values,
  }

  if (existing) {
    Object.assign(existing, next)
    return
  }

  memory.insert("OrganizationSchedulingPolicy", {
    id: `${organizationId}-policy`,
    organizationId,
    ...next,
  })
}

async function createMonthRoster() {
  return createRoster({
    name: "September 2026 — Emergency",
    departmentId: "dept-a",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  })
}

describe("organization scheduling policy integration", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seedPermissionCatalog()
    seedHospitals()
    grantManager(ROLE_A_ID)
    grantManager(ROLE_B_ID)
    authenticateAsA()
  })

  it("loads the current organization policy when creating an assignment", async () => {
    const roster = await createMonthRoster()
    setPolicy(ORG_A_ID, { minimumRestMinutes: 720 })
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-night",
      staffId: "staff-ama",
    })

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-04",
        shiftTypeId: "shift-day",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "INSUFFICIENT_REST",
    })
  })

  it("does not block an assignment when the matching policy rule is disabled", async () => {
    const roster = await createMonthRoster()
    setPolicy(ORG_A_ID, { minimumRestMinutes: null })
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-night",
      staffId: "staff-ama",
    })

    const { assignment } = await createAssignment({
      rosterId: roster.id,
      date: "2026-09-04",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    expect(assignment.date).toBe("2026-09-04")
  })

  it("ignores client-supplied policy fields on assignment input", async () => {
    const parsed = createAssignmentInputSchema.parse({
      rosterId: "roster-a",
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
      minimumRestMinutes: 0,
      organizationId: ORG_B_ID,
    })

    expect(parsed).not.toHaveProperty("minimumRestMinutes")
    expect(parsed).not.toHaveProperty("organizationId")
  })

  it("still enforces Phase 3D overlap when policy rules are disabled", async () => {
    const roster = await createMonthRoster()
    setPolicy(ORG_A_ID)
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-overlap",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ASSIGNMENT_OVERLAP",
    })
  })

  it("uses the current organization policy when validating a roster", async () => {
    const roster = await createMonthRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-night",
      staffId: "staff-ama",
    })
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-04",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    const disabled = await validateRoster(roster.id)
    expect(disabled.valid).toBe(true)
    expect(disabled.blockers.some((conflict) => conflict.code === "INSUFFICIENT_REST")).toBe(false)

    setPolicy(ORG_A_ID, { minimumRestMinutes: 720 })
    const enabled = await validateRoster(roster.id)
    expect(enabled.valid).toBe(false)
    expect(enabled.blockers.some((conflict) => conflict.code === "INSUFFICIENT_REST")).toBe(true)
  })

  it("keeps staffing shortfalls as warnings while policy blockers prevent publish", async () => {
    memory.insert("StaffingRequirement", {
      id: "req-day-nurse",
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      requiredCount: 3,
    })
    const roster = await createMonthRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-night",
      staffId: "staff-ama",
    })
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-04",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })
    setPolicy(ORG_A_ID, { minimumRestMinutes: 720 })

    const result = await validateRoster(roster.id)
    expect(result.warnings.some((conflict) => conflict.code === "STAFFING_SHORTFALL")).toBe(true)
    expect(result.blockers.some((conflict) => conflict.code === "INSUFFICIENT_REST")).toBe(true)
    expect(result.valid).toBe(false)

    await expect(submitRosterForReview(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_HAS_BLOCKING_CONFLICTS",
    })
  })

  it("does not use another organization's policy during validation", async () => {
    const roster = await createMonthRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-night",
      staffId: "staff-ama",
    })
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-04",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })
    setPolicy(ORG_B_ID, { minimumRestMinutes: 720 })

    const result = await validateRoster(roster.id)
    expect(result.valid).toBe(true)
    expect(result.blockers).toEqual([])
  })

  it("reloads current policy on publish so a later policy change can block publishing", async () => {
    const roster = await createMonthRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-night",
      staffId: "staff-ama",
    })
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-04",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    const previous = await validateRoster(roster.id)
    expect(previous.valid).toBe(true)
    await submitRosterForReview(roster.id)

    setPolicy(ORG_A_ID, { minimumRestMinutes: 720 })

    await expect(publishRoster(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_HAS_BLOCKING_CONFLICTS",
    })

    const stillInReview = await getRoster(roster.id)
    expect(stillInReview.status).toBe("IN_REVIEW")
  })

  it("does not allow a cross-tenant user to validate against another organization's roster", async () => {
    const roster = await createMonthRoster()
    authenticateAsB()

    await expect(validateRoster(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_FOUND",
    })
  })
})
