import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createAssignment } from "@/modules/rosters/services/assignments"
import { calculateCoverage } from "@/modules/rosters/services/coverage"
import { createRoster, getRoster } from "@/modules/rosters/services/rosters"

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
    id: "dept-b",
    organizationId: ORG_B_ID,
    name: "Emergency",
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
    id: "shift-b",
    organizationId: ORG_B_ID,
    name: "Day",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })
}

function cell(
  coverage: ReturnType<typeof calculateCoverage>,
  date: string,
  shiftTypeId: string,
  professionId: string,
) {
  return coverage.find(
    (entry) =>
      entry.date === date &&
      entry.shiftTypeId === shiftTypeId &&
      entry.professionId === professionId,
  )
}

describe("calculateCoverage", () => {
  const requirements = [
    { shiftTypeId: "shift-night", professionId: "prof-nurse", requiredCount: 3 },
  ]

  it("treats required 3 and assigned 0 as a shortfall of 3", () => {
    const coverage = calculateCoverage({
      startDate: "2026-09-03",
      endDate: "2026-09-03",
      requirements,
      assignments: [],
    })

    expect(cell(coverage, "2026-09-03", "shift-night", "prof-nurse")).toMatchObject({
      requiredCount: 3,
      assignedCount: 0,
      shortfall: 3,
      surplus: 0,
      status: "understaffed",
    })
  })

  it("treats required 3 and assigned 2 as a shortfall of 1", () => {
    const coverage = calculateCoverage({
      startDate: "2026-09-03",
      endDate: "2026-09-03",
      requirements,
      assignments: [
        { date: "2026-09-03", shiftTypeId: "shift-night", professionId: "prof-nurse" },
        { date: "2026-09-03", shiftTypeId: "shift-night", professionId: "prof-nurse" },
      ],
    })

    expect(cell(coverage, "2026-09-03", "shift-night", "prof-nurse")).toMatchObject({
      assignedCount: 2,
      shortfall: 1,
      status: "understaffed",
    })
  })

  it("treats required 3 and assigned 3 as covered", () => {
    const coverage = calculateCoverage({
      startDate: "2026-09-03",
      endDate: "2026-09-03",
      requirements,
      assignments: [
        { date: "2026-09-03", shiftTypeId: "shift-night", professionId: "prof-nurse" },
        { date: "2026-09-03", shiftTypeId: "shift-night", professionId: "prof-nurse" },
        { date: "2026-09-03", shiftTypeId: "shift-night", professionId: "prof-nurse" },
      ],
    })

    expect(cell(coverage, "2026-09-03", "shift-night", "prof-nurse")).toMatchObject({
      assignedCount: 3,
      shortfall: 0,
      surplus: 0,
      status: "covered",
    })
  })

  it("treats required 3 and assigned 4 as overstaffed by 1", () => {
    const coverage = calculateCoverage({
      startDate: "2026-09-03",
      endDate: "2026-09-03",
      requirements,
      assignments: Array.from({ length: 4 }, () => ({
        date: "2026-09-03",
        shiftTypeId: "shift-night",
        professionId: "prof-nurse",
      })),
    })

    expect(cell(coverage, "2026-09-03", "shift-night", "prof-nurse")).toMatchObject({
      assignedCount: 4,
      surplus: 1,
      shortfall: 0,
      status: "overstaffed",
    })
  })

  it("uses the assignment profession snapshot rather than a later staff profession", () => {
    const coverage = calculateCoverage({
      startDate: "2026-09-03",
      endDate: "2026-09-03",
      requirements,
      assignments: [
        { date: "2026-09-03", shiftTypeId: "shift-night", professionId: "prof-pharmacist" },
      ],
    })

    expect(cell(coverage, "2026-09-03", "shift-night", "prof-nurse")).toMatchObject({
      assignedCount: 0,
      shortfall: 3,
    })
    expect(cell(coverage, "2026-09-03", "shift-night", "prof-pharmacist")).toMatchObject({
      requiredCount: 0,
      assignedCount: 1,
      surplus: 1,
      status: "overstaffed",
    })
  })

  it("isolates dates and shift types", () => {
    const coverage = calculateCoverage({
      startDate: "2026-09-03",
      endDate: "2026-09-04",
      requirements: [
        { shiftTypeId: "shift-night", professionId: "prof-nurse", requiredCount: 3 },
        { shiftTypeId: "shift-day", professionId: "prof-nurse", requiredCount: 2 },
      ],
      assignments: [
        { date: "2026-09-03", shiftTypeId: "shift-night", professionId: "prof-nurse" },
        { date: "2026-09-04", shiftTypeId: "shift-day", professionId: "prof-nurse" },
        { date: "2026-09-04", shiftTypeId: "shift-day", professionId: "prof-nurse" },
      ],
    })

    expect(cell(coverage, "2026-09-03", "shift-night", "prof-nurse")?.assignedCount).toBe(1)
    expect(cell(coverage, "2026-09-03", "shift-day", "prof-nurse")?.assignedCount).toBe(0)
    expect(cell(coverage, "2026-09-04", "shift-day", "prof-nurse")).toMatchObject({
      assignedCount: 2,
      status: "covered",
    })
    expect(cell(coverage, "2026-09-04", "shift-night", "prof-nurse")?.assignedCount).toBe(0)
  })
})

describe("roster coverage isolation", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seedPermissionCatalog()
    seedHospitals()
    grantAll(ROLE_A_ID)
    grantAll(ROLE_B_ID)
    authenticateAsA()
  })

  it("uses stored assignment profession and isolates organizations", async () => {
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
    memory.insert("StaffingRequirement", {
      id: "req-a",
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      requiredCount: 3,
    })

    const roster = await createRoster({
      name: "Emergency September",
      departmentId: "dept-a",
      startDate: "2026-09-03",
      endDate: "2026-09-03",
    })
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })

    await memory.db.orm.public.StaffProfile.where({ id: "staff-ama" }).update({
      professionId: "prof-pharmacist",
    })

    const detail = await getRoster(roster.id)
    const nurseCell = detail.coverage.find(
      (entry) =>
        entry.date === "2026-09-03" &&
        entry.shiftTypeId === "shift-day" &&
        entry.professionId === "prof-nurse",
    )

    expect(nurseCell).toMatchObject({
      assignedCount: 1,
      requiredCount: 3,
      shortfall: 2,
    })

    authenticateAsB()
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
    memory.insert("StaffingRequirement", {
      id: "req-b",
      organizationId: ORG_B_ID,
      departmentId: "dept-b",
      shiftTypeId: "shift-b",
      professionId: "prof-nurse",
      requiredCount: 3,
    })

    const hospitalB = await createRoster({
      name: "Hospital B",
      departmentId: "dept-b",
      startDate: "2026-09-03",
      endDate: "2026-09-03",
    })
    const hospitalBDetail = await getRoster(hospitalB.id)
    expect(hospitalBDetail.assignmentCount).toBe(0)
    expect(
      hospitalBDetail.coverage.find(
        (entry) => entry.shiftTypeId === "shift-b" && entry.professionId === "prof-nurse",
      ),
    ).toMatchObject({
      assignedCount: 0,
      requiredCount: 3,
    })
  })
})
