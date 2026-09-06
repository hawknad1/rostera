import { Temporal } from "temporal-polyfill"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createAssignmentInputSchema } from "@/modules/rosters/schemas/assignment"
import {
  createAssignment,
  deleteAssignment,
} from "@/modules/rosters/services/assignments"
import { createRoster } from "@/modules/rosters/services/rosters"

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

function authenticateAsB() {
  getAuthUser.mockResolvedValue({ id: AUTH_USER_B })
}

function seedPermissionCatalog() {
  memory.insert("Permission", { id: PERMISSION_IDS.view, key: permissions.rosterView })
  memory.insert("Permission", { id: PERMISSION_IDS.create, key: permissions.rosterCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.edit, key: permissions.rosterEdit })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function grantAll(roleId: string) {
  grant(roleId, PERMISSION_IDS.view)
  grant(roleId, PERMISSION_IDS.create)
  grant(roleId, PERMISSION_IDS.edit)
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
  memory.insert("Profession", {
    id: "prof-pharmacist",
    organizationId: null,
    name: "Pharmacist",
    isActive: true,
  })
  memory.insert("Department", {
    id: "dept-a",
    organizationId: ORG_A_ID,
    name: "Emergency",
  })
  memory.insert("Department", {
    id: "dept-a-icu",
    organizationId: ORG_A_ID,
    name: "ICU",
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
    id: "staff-kofi",
    organizationId: ORG_A_ID,
    staffNumber: "NUR-003",
    firstName: "Kofi",
    lastName: "Owusu",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-icu",
    organizationId: ORG_A_ID,
    staffNumber: "NUR-002",
    firstName: "Kojo",
    lastName: "Mensah",
    professionId: "prof-nurse",
    departmentId: "dept-a-icu",
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
    id: "shift-evening",
    organizationId: ORG_A_ID,
    name: "Evening",
    startTime: "16:00",
    endTime: "00:00",
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
    id: "shift-night",
    organizationId: ORG_A_ID,
    name: "Night",
    startTime: "22:00",
    endTime: "06:00",
    isOvernight: true,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-early",
    organizationId: ORG_A_ID,
    name: "Dawn",
    startTime: "05:00",
    endTime: "13:00",
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

async function createDefaultRoster() {
  return createRoster({
    name: "September 2026 — Emergency Department",
    departmentId: "dept-a",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  })
}

describe("assignment services", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seedPermissionCatalog()
    seedHospitals()
    grantAll(ROLE_A_ID)
    grantAll(ROLE_B_ID)
    authenticateAsA()
  })

  it("creates a valid assignment with snapshots from staff, roster, and shift type", async () => {
    const roster = await createDefaultRoster()
    const { assignment } = await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-night",
      staffId: "staff-ama",
    })

    expect(assignment).toMatchObject({
      organizationId: ORG_A_ID,
      rosterId: roster.id,
      departmentId: "dept-a",
      staffId: "staff-ama",
      shiftTypeId: "shift-night",
      professionId: "prof-nurse",
      date: "2026-09-03",
      shiftStartTime: "22:00",
      shiftEndTime: "06:00",
      isOvernight: true,
    })
    expect(Temporal.Instant.from(assignment.startDateTime as never).toString()).toBe(
      "2026-09-03T22:00:00Z",
    )
    expect(Temporal.Instant.from(assignment.endDateTime as never).toString()).toBe(
      "2026-09-04T06:00:00Z",
    )
  })

  it("strips client-supplied profession, department, and organization fields", () => {
    const parsed = createAssignmentInputSchema.parse({
      rosterId: "roster-1",
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
      professionId: "prof-pharmacist",
      departmentId: "dept-a-icu",
      organizationId: ORG_B_ID,
    })

    expect(parsed).toEqual({
      rosterId: "roster-1",
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })
  })

  it("rejects staff from another organization", async () => {
    const roster = await createDefaultRoster()

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-day",
        staffId: "staff-b",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "STAFF_NOT_FOUND",
    })
  })

  it("rejects a roster from another organization", async () => {
    authenticateAsB()
    const hospitalB = await createRoster({
      name: "Hospital B roster",
      departmentId: "dept-b",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    })

    authenticateAsA()
    await expect(
      createAssignment({
        rosterId: hospitalB.id,
        date: "2026-09-03",
        shiftTypeId: "shift-day",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_FOUND",
    })
  })

  it("rejects a shift type from another organization", async () => {
    const roster = await createDefaultRoster()

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-b",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "SHIFT_TYPE_NOT_FOUND",
    })
  })

  it("rejects staff from the wrong department", async () => {
    const roster = await createDefaultRoster()

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-day",
        staffId: "staff-icu",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "STAFF_WRONG_DEPARTMENT",
    })
  })

  it("rejects inactive staff", async () => {
    const roster = await createDefaultRoster()
    await memory.db.orm.public.StaffProfile.where({ id: "staff-ama" }).update({
      employmentStatus: "TERMINATED",
    })

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-day",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "STAFF_INACTIVE",
    })
  })

  it("rejects an inactive shift type", async () => {
    const roster = await createDefaultRoster()
    await memory.db.orm.public.ShiftType.where({ id: "shift-day" }).update({
      isActive: false,
    })

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-day",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "SHIFT_TYPE_INACTIVE",
    })
  })

  it("rejects staff without a profession", async () => {
    const roster = await createDefaultRoster()
    memory.insert("StaffProfile", {
      id: "staff-no-prof",
      organizationId: ORG_A_ID,
      staffNumber: "NUR-099",
      firstName: "No",
      lastName: "Profession",
      professionId: "",
      departmentId: "dept-a",
      employmentStatus: "ACTIVE",
    })

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-day",
        staffId: "staff-no-prof",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "STAFF_NO_PROFESSION",
    })
  })

  it("rejects an assignment outside the roster date range", async () => {
    const roster = await createDefaultRoster()

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-10-01",
        shiftTypeId: "shift-day",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ASSIGNMENT_OUTSIDE_ROSTER",
    })
  })

  it("rejects a duplicate assignment", async () => {
    const roster = await createDefaultRoster()
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
        shiftTypeId: "shift-day",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ASSIGNMENT_DUPLICATE",
    })
  })

  it("enforces assignment uniqueness in the data store", async () => {
    const roster = await createDefaultRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    await expect(
      memory.db.orm.public.ShiftAssignment.create({
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
        startDateTime: Temporal.Instant.from("2026-09-03T08:00:00Z"),
        endDateTime: Temporal.Instant.from("2026-09-03T16:00:00Z"),
      }),
    ).rejects.toMatchObject({ sqlState: "23505" })
  })

  it("rejects overlapping assignments and allows adjacent ones", async () => {
    const roster = await createDefaultRoster()
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

    const { assignment: adjacent } = await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-evening",
      staffId: "staff-ama",
    })

    expect(adjacent.shiftTypeId).toBe("shift-evening")
  })

  it("enforces staff overlap in the data store even when the service pre-check is skipped", async () => {
    const roster = await createDefaultRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    await expect(
      memory.db.orm.public.ShiftAssignment.create({
        organizationId: ORG_A_ID,
        rosterId: roster.id,
        departmentId: "dept-a",
        staffId: "staff-ama",
        shiftTypeId: "shift-overlap",
        professionId: "prof-nurse",
        date: "2026-09-03",
        shiftStartTime: "14:00",
        shiftEndTime: "22:00",
        isOvernight: false,
        startDateTime: Temporal.Instant.from("2026-09-03T14:00:00Z"),
        endDateTime: Temporal.Instant.from("2026-09-03T22:00:00Z"),
      }),
    ).rejects.toMatchObject({
      sqlState: "23P01",
      constraint: "shiftAssignment_staff_time_excl",
    })
  })

  it("maps a database exclusion violation to ASSIGNMENT_OVERLAP", async () => {
    const roster = await createDefaultRoster()
    const exclusionError = new Error("exclusion constraint violation") as Error & {
      kind: "sql_query"
      sqlState: "23P01"
    }
    exclusionError.kind = "sql_query"
    exclusionError.sqlState = "23P01"
    memory.failNextCreate("ShiftAssignment", exclusionError)

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-day",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ASSIGNMENT_OVERLAP",
      message: "This assignment overlaps another shift for this staff member.",
    })
  })

  it("detects overnight overlap into the next morning", async () => {
    const roster = await createDefaultRoster()
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
        shiftTypeId: "shift-early",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ASSIGNMENT_OVERLAP",
    })
  })

  it("allows an overnight assignment followed by a non-overlapping next-day shift", async () => {
    const roster = await createDefaultRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-night",
      staffId: "staff-ama",
    })

    const { assignment: nextDay } = await createAssignment({
      rosterId: roster.id,
      date: "2026-09-04",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    expect(nextDay.shiftTypeId).toBe("shift-day")
  })

  it("allows different staff members to hold overlapping assignments", async () => {
    const roster = await createDefaultRoster()
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    const { assignment: otherStaff } = await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-kofi",
    })

    expect(otherStaff.staffId).toBe("staff-kofi")
  })

  it("rejects the same staff overlapping across different rosters", async () => {
    const roster = await createDefaultRoster()
    const otherRoster = await createRoster({
      name: "September 2026 — Overflow",
      departmentId: "dept-a",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    })

    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    await expect(
      createAssignment({
        rosterId: otherRoster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-overlap",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ASSIGNMENT_OVERLAP",
    })

    await expect(
      memory.db.orm.public.ShiftAssignment.create({
        organizationId: ORG_A_ID,
        rosterId: otherRoster.id,
        departmentId: "dept-a",
        staffId: "staff-ama",
        shiftTypeId: "shift-overlap",
        professionId: "prof-nurse",
        date: "2026-09-03",
        shiftStartTime: "14:00",
        shiftEndTime: "22:00",
        isOvernight: false,
        startDateTime: Temporal.Instant.from("2026-09-03T14:00:00Z"),
        endDateTime: Temporal.Instant.from("2026-09-03T22:00:00Z"),
      }),
    ).resolves.toMatchObject({
      rosterId: otherRoster.id,
      staffId: "staff-ama",
    })
  })

  it("allows a September 30 overnight assignment that ends on October 1", async () => {
    const roster = await createDefaultRoster()
    const { assignment } = await createAssignment({
      rosterId: roster.id,
      date: "2026-09-30",
      shiftTypeId: "shift-night",
      staffId: "staff-ama",
    })

    expect(assignment.date).toBe("2026-09-30")
    expect(Temporal.Instant.from(assignment.endDateTime as never).toString()).toBe(
      "2026-10-01T06:00:00Z",
    )
  })

  it("rejects assignment create and delete on a non-draft roster", async () => {
    memory.insert("Roster", {
      id: "roster-published",
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      name: "Published",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      status: "PUBLISHED",
      createdByUserId: USER_A_ID,
    })

    await expect(
      createAssignment({
        rosterId: "roster-published",
        date: "2026-09-03",
        shiftTypeId: "shift-day",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_DRAFT",
    })

    memory.insert("ShiftAssignment", {
      id: "assignment-published",
      organizationId: ORG_A_ID,
      rosterId: "roster-published",
      departmentId: "dept-a",
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

    await expect(deleteAssignment({ id: "assignment-published" })).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_DRAFT",
    })
  })

  it("uses the staff profession and roster department even if the client sent others", async () => {
    const roster = await createDefaultRoster()
    const { assignment } = await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    expect(assignment.professionId).toBe("prof-nurse")
    expect(assignment.departmentId).toBe("dept-a")
  })

  it("requires roster.edit to create an assignment", async () => {
    const roster = await createDefaultRoster()
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    grant(ROLE_A_ID, PERMISSION_IDS.create)
    authenticateAsA()
    memory.insert("Roster", {
      id: roster.id,
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      name: roster.name,
      startDate: roster.startDate,
      endDate: roster.endDate,
      status: "DRAFT",
      createdByUserId: USER_A_ID,
    })

    await expect(
      createAssignment({
        rosterId: roster.id,
        date: "2026-09-03",
        shiftTypeId: "shift-day",
        staffId: "staff-ama",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "FORBIDDEN",
    })
  })

  it("removes an assignment from a draft roster", async () => {
    const roster = await createDefaultRoster()
    const { assignment } = await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    await deleteAssignment({ id: assignment.id })
    expect(memory.tables.ShiftAssignment).toHaveLength(0)
  })

  it("rejects a blocking scheduling conflict from the engine", async () => {
    const roster = await createDefaultRoster()
    memory.insert("OrganizationSchedulingPolicy", {
      id: "policy-a",
      organizationId: ORG_A_ID,
      minimumRestMinutes: 720,
      maximumWeeklyMinutes: null,
      maximumConsecutiveDays: null,
      maximumNightShiftsPerWeek: null,
      maximumWeekendShifts: null,
    })
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

  it("creates an assignment and returns a non-blocking warning", async () => {
    const roster = await createDefaultRoster()
    memory.insert("StaffingRequirement", {
      id: "req-nurse-day",
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      requiredCount: 3,
    })

    const { assignment, warnings } = await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    expect(assignment.staffId).toBe("staff-ama")
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "STAFFING_SHORTFALL",
          severity: "WARNING",
          blocking: false,
        }),
      ]),
    )
  })
})
