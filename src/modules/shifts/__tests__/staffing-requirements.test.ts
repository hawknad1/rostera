import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { deleteDepartment } from "@/modules/departments/services/departments"
import { createStaffingRequirementInputSchema } from "@/modules/shifts/schemas/staffing-requirement"
import { createShiftType, deactivateShiftType } from "@/modules/shifts/services/shift-types"
import {
  createStaffingRequirement,
  deleteStaffingRequirement,
  getStaffingRequirement,
  listStaffingRequirements,
  updateStaffingRequirement,
} from "@/modules/shifts/services/staffing-requirements"

const AUTH_USER_A = "supabase-auth-user-a"
const AUTH_USER_B = "supabase-auth-user-b"
const USER_A_ID = "user-a"
const USER_B_ID = "user-b"
const ORG_A_ID = "org-a"
const ORG_B_ID = "org-b"
const ROLE_A_ID = "role-a"
const ROLE_B_ID = "role-b"

const PERMISSION_IDS = {
  view: "perm-shift-view",
  create: "perm-shift-create",
  edit: "perm-shift-edit",
  deactivate: "perm-shift-deactivate",
  departmentView: "perm-department-view",
  departmentDelete: "perm-department-delete",
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
  memory.insert("Permission", { id: PERMISSION_IDS.view, key: permissions.shiftView })
  memory.insert("Permission", { id: PERMISSION_IDS.create, key: permissions.shiftCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.edit, key: permissions.shiftEdit })
  memory.insert("Permission", { id: PERMISSION_IDS.deactivate, key: permissions.shiftDeactivate })
  memory.insert("Permission", {
    id: PERMISSION_IDS.departmentView,
    key: permissions.departmentView,
  })
  memory.insert("Permission", {
    id: PERMISSION_IDS.departmentDelete,
    key: permissions.departmentDelete,
  })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function grantAll(roleId: string) {
  grant(roleId, PERMISSION_IDS.view)
  grant(roleId, PERMISSION_IDS.create)
  grant(roleId, PERMISSION_IDS.edit)
  grant(roleId, PERMISSION_IDS.deactivate)
  grant(roleId, PERMISSION_IDS.departmentView)
  grant(roleId, PERMISSION_IDS.departmentDelete)
}

function seedHospitals() {
  memory.insert("Organization", { id: ORG_A_ID, name: "Hospital A", slug: "hospital-a" })
  memory.insert("Organization", { id: ORG_B_ID, name: "Hospital B", slug: "hospital-b" })
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
}

function seedStructure() {
  memory.insert("Department", { id: "dept-a", organizationId: ORG_A_ID, name: "Emergency" })
  memory.insert("Department", { id: "dept-b", organizationId: ORG_B_ID, name: "Emergency" })
  memory.insert("Profession", {
    id: "prof-global",
    organizationId: null,
    name: "Registered Nurse",
    isActive: true,
  })
  memory.insert("Profession", {
    id: "prof-a",
    organizationId: ORG_A_ID,
    name: "Senior Emergency Nurse",
    isActive: true,
  })
  memory.insert("Profession", {
    id: "prof-b",
    organizationId: ORG_B_ID,
    name: "Hospital B Nurse",
    isActive: true,
  })
  memory.insert("Profession", {
    id: "prof-a-inactive",
    organizationId: ORG_A_ID,
    name: "Retired Role",
    isActive: false,
  })
}

async function createOrgShift(name: string, overnight = false) {
  return createShiftType({
    name,
    startTime: overnight ? "22:00" : "08:00",
    endTime: overnight ? "06:00" : "16:00",
    isOvernight: overnight,
  })
}

describe("staffing requirement services", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seedPermissionCatalog()
    seedHospitals()
    seedStructure()
    grantAll(ROLE_A_ID)
    grantAll(ROLE_B_ID)
    authenticateAsA()
  })

  it("creates a valid requirement", async () => {
    const shift = await createOrgShift("Night", true)
    const requirement = await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-global",
      requiredCount: 3,
    })

    expect(requirement).toMatchObject({
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-global",
      requiredCount: 3,
    })
  })

  it("denies create when shift.create is missing", async () => {
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    seedStructure()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    grant(ROLE_A_ID, PERMISSION_IDS.edit)
    grant(ROLE_A_ID, PERMISSION_IDS.deactivate)
    authenticateAsA()

    memory.insert("ShiftType", {
      id: "shift-a",
      organizationId: ORG_A_ID,
      name: "Day",
      startTime: "08:00",
      endTime: "16:00",
      isOvernight: false,
      isActive: true,
    })

    await expect(
      createStaffingRequirement({
        departmentId: "dept-a",
        shiftTypeId: "shift-a",
        professionId: "prof-global",
        requiredCount: 2,
      }),
    ).rejects.toMatchObject({
      name: "ShiftError",
      code: "FORBIDDEN",
    })
  })

  it("rejects a cross-tenant department", async () => {
    const shift = await createOrgShift("Day")

    await expect(
      createStaffingRequirement({
        departmentId: "dept-b",
        shiftTypeId: shift.id,
        professionId: "prof-global",
        requiredCount: 2,
      }),
    ).rejects.toMatchObject({
      name: "ShiftError",
      code: "NOT_FOUND",
    })
  })

  it("rejects a cross-tenant shift type", async () => {
    authenticateAsB()
    const hospitalBShift = await createOrgShift("Night", true)

    authenticateAsA()
    await expect(
      createStaffingRequirement({
        departmentId: "dept-a",
        shiftTypeId: hospitalBShift.id,
        professionId: "prof-global",
        requiredCount: 2,
      }),
    ).rejects.toMatchObject({
      name: "ShiftError",
      code: "NOT_FOUND",
    })
  })

  it("rejects a cross-tenant profession", async () => {
    const shift = await createOrgShift("Day")

    await expect(
      createStaffingRequirement({
        departmentId: "dept-a",
        shiftTypeId: shift.id,
        professionId: "prof-b",
        requiredCount: 2,
      }),
    ).rejects.toMatchObject({
      name: "ShiftError",
      code: "NOT_FOUND",
    })
  })

  it("accepts a global profession", async () => {
    const shift = await createOrgShift("Day")
    const requirement = await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-global",
      requiredCount: 2,
    })

    expect(requirement.professionId).toBe("prof-global")
  })

  it("accepts a same-organization profession", async () => {
    const shift = await createOrgShift("Day")
    const requirement = await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-a",
      requiredCount: 1,
    })

    expect(requirement.professionId).toBe("prof-a")
  })

  it("rejects an inactive shift type for a new requirement", async () => {
    const shift = await createOrgShift("Night", true)
    await deactivateShiftType({ id: shift.id })

    await expect(
      createStaffingRequirement({
        departmentId: "dept-a",
        shiftTypeId: shift.id,
        professionId: "prof-global",
        requiredCount: 3,
      }),
    ).rejects.toMatchObject({
      name: "ShiftError",
      code: "CONFLICT",
    })
  })

  it("keeps existing requirements when a shift is later deactivated", async () => {
    const shift = await createOrgShift("Night", true)
    const requirement = await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-global",
      requiredCount: 3,
    })

    await deactivateShiftType({ id: shift.id })
    const retrieved = await getStaffingRequirement(requirement.id)
    expect(retrieved.requiredCount).toBe(3)
    expect(retrieved.shiftTypeIsActive).toBe(false)
  })

  it("rejects a non-positive required count through the schema", () => {
    expect(
      createStaffingRequirementInputSchema.safeParse({
        departmentId: "dept-a",
        shiftTypeId: "shift-a",
        professionId: "prof-global",
        requiredCount: 0,
      }).success,
    ).toBe(false)
  })

  it("rejects a duplicate requirement combination", async () => {
    const shift = await createOrgShift("Night", true)
    await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-global",
      requiredCount: 3,
    })

    await expect(
      createStaffingRequirement({
        departmentId: "dept-a",
        shiftTypeId: shift.id,
        professionId: "prof-global",
        requiredCount: 2,
      }),
    ).rejects.toMatchObject({
      name: "ShiftError",
      code: "DUPLICATE",
    })
  })

  it("enforces combination uniqueness in the data store", async () => {
    const shift = await createOrgShift("Day")
    await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-global",
      requiredCount: 3,
    })

    await expect(
      memory.db.orm.public.StaffingRequirement.create({
        organizationId: ORG_A_ID,
        departmentId: "dept-a",
        shiftTypeId: shift.id,
        professionId: "prof-global",
        requiredCount: 1,
      }),
    ).rejects.toMatchObject({ sqlState: "23505" })
  })

  it("updates a requirement within the tenant", async () => {
    const shift = await createOrgShift("Day")
    const created = await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-global",
      requiredCount: 3,
    })

    const updated = await updateStaffingRequirement({
      id: created.id,
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-a",
      requiredCount: 2,
    })

    expect(updated).toMatchObject({
      professionId: "prof-a",
      requiredCount: 2,
      organizationId: ORG_A_ID,
    })
  })

  it("does not let Hospital A update Hospital B's requirement", async () => {
    authenticateAsB()
    const hospitalBShift = await createOrgShift("Day")
    const hospitalB = await createStaffingRequirement({
      departmentId: "dept-b",
      shiftTypeId: hospitalBShift.id,
      professionId: "prof-global",
      requiredCount: 4,
    })

    authenticateAsA()
    const hospitalAShift = await createOrgShift("Day")
    await expect(
      updateStaffingRequirement({
        id: hospitalB.id,
        departmentId: "dept-a",
        shiftTypeId: hospitalAShift.id,
        professionId: "prof-global",
        requiredCount: 1,
      }),
    ).rejects.toMatchObject({
      name: "ShiftError",
      code: "NOT_FOUND",
    })
    expect(memory.tables.StaffingRequirement[0]?.requiredCount).toBe(4)
  })

  it("lists only the current organization's requirements", async () => {
    const shiftA = await createOrgShift("Day")
    await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: shiftA.id,
      professionId: "prof-global",
      requiredCount: 2,
    })

    authenticateAsB()
    const shiftB = await createOrgShift("Day")
    await createStaffingRequirement({
      departmentId: "dept-b",
      shiftTypeId: shiftB.id,
      professionId: "prof-global",
      requiredCount: 5,
    })

    authenticateAsA()
    const listed = await listStaffingRequirements()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.requiredCount).toBe(2)
  })

  it("does not let Hospital A delete Hospital B's requirement", async () => {
    authenticateAsB()
    const hospitalBShift = await createOrgShift("Day")
    const hospitalB = await createStaffingRequirement({
      departmentId: "dept-b",
      shiftTypeId: hospitalBShift.id,
      professionId: "prof-global",
      requiredCount: 2,
    })

    authenticateAsA()
    await expect(deleteStaffingRequirement({ id: hospitalB.id })).rejects.toMatchObject({
      name: "ShiftError",
      code: "NOT_FOUND",
    })
    expect(memory.tables.StaffingRequirement).toHaveLength(1)
  })

  it("deletes a requirement within the tenant", async () => {
    const shift = await createOrgShift("Day")
    const created = await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-global",
      requiredCount: 2,
    })

    await deleteStaffingRequirement({ id: created.id })
    expect(memory.tables.StaffingRequirement).toHaveLength(0)
  })

  it("does not let a department be deleted while it has staffing requirements", async () => {
    const shift = await createOrgShift("Day")
    await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: shift.id,
      professionId: "prof-global",
      requiredCount: 2,
    })

    await expect(deleteDepartment({ id: "dept-a" })).rejects.toMatchObject({
      name: "DepartmentError",
      code: "IN_USE",
    })
  })

  it("strips client organizationId from the input schema", () => {
    const parsed = createStaffingRequirementInputSchema.parse({
      departmentId: "dept-a",
      shiftTypeId: "shift-a",
      professionId: "prof-global",
      requiredCount: "3",
      organizationId: ORG_B_ID,
    })

    expect(parsed).toEqual({
      departmentId: "dept-a",
      shiftTypeId: "shift-a",
      professionId: "prof-global",
      requiredCount: 3,
    })
    expect(parsed).not.toHaveProperty("organizationId")
  })
})
