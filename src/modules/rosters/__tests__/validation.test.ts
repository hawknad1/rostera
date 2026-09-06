import { Temporal } from "temporal-polyfill"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { assignmentDateTimeWindow } from "@/lib/dates/assignment-window"
import { permissions } from "@/lib/permissions/permissions"
import { createAssignment } from "@/modules/rosters/services/assignments"
import { createRoster } from "@/modules/rosters/services/rosters"
import { validateRoster } from "@/modules/rosters/services/validation"
import { sortConflicts } from "@/modules/scheduling/engine/sortConflicts"

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

function seedPermissionCatalog() {
  memory.insert("Permission", { id: PERMISSION_IDS.view, key: permissions.rosterView })
  memory.insert("Permission", { id: PERMISSION_IDS.create, key: permissions.rosterCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.edit, key: permissions.rosterEdit })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
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
  memory.insert("Role", { id: ROLE_A_ID, organizationId: ORG_A_ID, name: "SUPER_ADMIN" })
  memory.insert("Role", { id: ROLE_B_ID, organizationId: ORG_B_ID, name: "SUPER_ADMIN" })
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
    id: "shift-night",
    organizationId: ORG_A_ID,
    name: "Night",
    startTime: "22:00",
    endTime: "06:00",
    isOvernight: true,
    isActive: true,
  })
}

function insertAssignment(input: {
  id: string
  rosterId: string
  staffId?: string
  shiftTypeId: string
  professionId?: string
  date: string
  startTime: string
  endTime: string
  isOvernight?: boolean
}) {
  const isOvernight = input.isOvernight ?? false
  const window = assignmentDateTimeWindow({
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    isOvernight,
    timeZone: "Africa/Accra",
  })

  memory.insert("ShiftAssignment", {
    id: input.id,
    organizationId: ORG_A_ID,
    rosterId: input.rosterId,
    departmentId: "dept-a",
    staffId: input.staffId ?? "staff-ama",
    shiftTypeId: input.shiftTypeId,
    professionId: input.professionId ?? "prof-nurse",
    date: input.date,
    shiftStartTime: input.startTime,
    shiftEndTime: input.endTime,
    isOvernight,
    startDateTime: window.start,
    endDateTime: window.end,
  })
}

async function createDayRoster() {
  return createRoster({
    name: "3 September — Emergency",
    departmentId: "dept-a",
    startDate: "2026-09-03",
    endDate: "2026-09-03",
  })
}

describe("roster validation", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    grant(ROLE_A_ID, PERMISSION_IDS.create)
    grant(ROLE_A_ID, PERMISSION_IDS.edit)
    grant(ROLE_B_ID, PERMISSION_IDS.view)
    authenticateAsA()
  })

  it("returns valid=true for a roster with no blockers", async () => {
    const roster = await createDayRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    const result = await validateRoster(roster.id)

    expect(result.valid).toBe(true)
    expect(result.summary.assignmentsChecked).toBe(1)
    expect(result.summary.blockerCount).toBe(0)
  })

  it("does not treat staffing shortfall as a blocker", async () => {
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

    const result = await validateRoster(roster.id)

    expect(result.warnings.some((conflict) => conflict.code === "STAFFING_SHORTFALL")).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.coverage.understaffedCount).toBeGreaterThan(0)
    expect(result.coverage.satisfiedCount).toBe(0)
  })

  it("detects coverage shortfall and overstaffing", async () => {
    memory.insert("StaffingRequirement", {
      id: "req-day-nurse",
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      requiredCount: 1,
    })
    const roster = await createDayRoster()
    const empty = await validateRoster(roster.id)
    expect(empty.coverage.understaffedCount).toBe(1)
    expect(empty.valid).toBe(true)

    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })
    insertAssignment({
      id: "extra-late",
      rosterId: roster.id,
      shiftTypeId: "shift-late",
      date: "2026-09-03",
      startTime: "16:00",
      endTime: "22:00",
    })

    const result = await validateRoster(roster.id)
    expect(result.coverage.satisfiedCount).toBe(1)
    expect(result.infos.some((conflict) => conflict.code === "STAFFING_OVERSTAFFED")).toBe(true)
  })

  it("returns valid=false for a blocker and keeps conflict order deterministic", async () => {
    const roster = await createDayRoster()
    insertAssignment({
      id: "a-day",
      rosterId: roster.id,
      shiftTypeId: "shift-day",
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
    })
    insertAssignment({
      id: "a-late",
      rosterId: roster.id,
      shiftTypeId: "shift-late",
      professionId: "prof-pharmacist",
      date: "2026-09-03",
      startTime: "14:00",
      endTime: "22:00",
    })

    const result = await validateRoster(roster.id)
    const codes = result.blockers.map((conflict) => conflict.code)
    const resorted = sortConflicts(result.blockers).map((conflict) => conflict.code)

    expect(result.valid).toBe(false)
    expect(codes.length).toBeGreaterThan(1)
    expect(codes).toEqual(resorted)
    expect(codes).toEqual(expect.arrayContaining(["ASSIGNMENT_OVERLAP", "QUALIFICATION_MISMATCH"]))
  })

  it("does not invent rest or hours blockers when production config is empty", async () => {
    const roster = await createRoster({
      name: "Overnight then day",
      departmentId: "dept-a",
      startDate: "2026-09-03",
      endDate: "2026-09-04",
    })
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

    const result = await validateRoster(roster.id)

    expect(result.valid).toBe(true)
    expect(result.blockers).toEqual([])
    expect(result.warnings.some((conflict) => conflict.code === "INSUFFICIENT_REST")).toBe(false)
  })

  it("does not include another organization's roster in validation", async () => {
    const roster = await createDayRoster()
    memory.insert("ShiftAssignment", {
      id: "org-b-assignment",
      organizationId: ORG_B_ID,
      rosterId: "roster-b",
      departmentId: "dept-b",
      staffId: "staff-ama",
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      date: "2026-09-03",
      shiftStartTime: "08:00",
      shiftEndTime: "16:00",
      isOvernight: false,
      startDateTime: Temporal.Instant.from("2026-09-03T08:00:00Z"),
      endDateTime: Temporal.Instant.from("2026-09-03T16:00:00Z"),
    })

    const result = await validateRoster(roster.id)
    expect(result.summary.assignmentsChecked).toBe(0)
    expect(result.valid).toBe(true)
  })

  it("requires roster.view", async () => {
    const roster = await createDayRoster()
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.create)
    authenticateAsA()

    await expect(validateRoster(roster.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "FORBIDDEN",
    })
  })
})
