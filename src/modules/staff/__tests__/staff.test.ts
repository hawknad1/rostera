import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createStaffInputSchema, updateStaffInputSchema } from "@/modules/staff/schemas/staff"
import {
  assignDepartmentHead,
  createStaff,
  deactivateStaff,
  getStaff,
  linkStaffToUser,
  listStaff,
  updateStaff,
} from "@/modules/staff/services/staff"

const AUTH_USER_A = "supabase-auth-user-a"
const AUTH_USER_B = "supabase-auth-user-b"
const USER_A_ID = "user-a"
const USER_B_ID = "user-b"
const USER_A2_ID = "user-a-2"
const ORG_A_ID = "org-a"
const ORG_B_ID = "org-b"
const ROLE_A_ID = "role-a"
const ROLE_B_ID = "role-b"

const PERMISSION_IDS = {
  view: "perm-staff-view",
  create: "perm-staff-create",
  edit: "perm-staff-edit",
  deactivate: "perm-staff-deactivate",
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
  memory.insert("Permission", { id: PERMISSION_IDS.view, key: permissions.staffView })
  memory.insert("Permission", { id: PERMISSION_IDS.create, key: permissions.staffCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.edit, key: permissions.staffEdit })
  memory.insert("Permission", { id: PERMISSION_IDS.deactivate, key: permissions.staffDeactivate })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function grantAll(roleId: string) {
  grant(roleId, PERMISSION_IDS.view)
  grant(roleId, PERMISSION_IDS.create)
  grant(roleId, PERMISSION_IDS.edit)
  grant(roleId, PERMISSION_IDS.deactivate)
}

function seedHospitals() {
  memory.insert("Organization", { id: ORG_A_ID, name: "Hospital A", slug: "hospital-a" })
  memory.insert("Organization", { id: ORG_B_ID, name: "Hospital B", slug: "hospital-b" })
  memory.insert("User", { id: USER_A_ID, authProviderId: AUTH_USER_A, email: "a@test.local" })
  memory.insert("User", { id: USER_B_ID, authProviderId: AUTH_USER_B, email: "b@test.local" })
  memory.insert("User", { id: USER_A2_ID, authProviderId: "supabase-auth-user-a-2", email: "a2@test.local" })
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
  memory.insert("OrganizationMember", {
    id: "membership-a-2",
    organizationId: ORG_A_ID,
    userId: USER_A2_ID,
    roleId: ROLE_A_ID,
    status: "ACTIVE",
  })
}

function seedStructure() {
  memory.insert("Profession", {
    id: "prof-global",
    organizationId: null,
    name: "Nurse",
    isActive: true,
  })
  memory.insert("Profession", {
    id: "prof-a",
    organizationId: ORG_A_ID,
    name: "Theatre Nurse",
    isActive: true,
  })
  memory.insert("Profession", {
    id: "prof-a-inactive",
    organizationId: ORG_A_ID,
    name: "Retired Role",
    isActive: false,
  })
  memory.insert("Profession", {
    id: "prof-b",
    organizationId: ORG_B_ID,
    name: "Hospital B Nurse",
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
}

const validCreate = {
  firstName: "Ama",
  lastName: "Mensah",
  staffNumber: "NUR-001",
  professionId: "prof-global",
  departmentId: "dept-a",
  employmentStatus: "ACTIVE" as const,
  employmentType: "FULL_TIME" as const,
}

describe("staff services", () => {
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

  it("lets Hospital A list its staff and not Hospital B's staff", async () => {
    await createStaff(validCreate)
    authenticateAsB()
    await createStaff({
      ...validCreate,
      staffNumber: "NUR-001",
      departmentId: "dept-b",
      professionId: "prof-b",
      firstName: "Kojo",
    })

    authenticateAsA()
    const staff = await listStaff()
    expect(staff).toHaveLength(1)
    expect(staff[0]).toMatchObject({
      staffNumber: "NUR-001",
      firstName: "Ama",
      organizationId: ORG_A_ID,
    })
  })

  it("does not let Hospital A retrieve Hospital B's staff", async () => {
    authenticateAsB()
    const hospitalB = await createStaff({
      ...validCreate,
      departmentId: "dept-b",
      professionId: "prof-b",
    })

    authenticateAsA()
    await expect(getStaff(hospitalB.id)).rejects.toMatchObject({
      name: "StaffError",
      code: "NOT_FOUND",
    })
  })

  it("does not let Hospital A edit Hospital B's staff", async () => {
    authenticateAsB()
    const hospitalB = await createStaff({
      ...validCreate,
      departmentId: "dept-b",
      professionId: "prof-b",
    })

    authenticateAsA()
    await expect(
      updateStaff({
        id: hospitalB.id,
        firstName: "Hijacked",
        lastName: "Name",
        professionId: "prof-global",
        departmentId: "dept-a",
        employmentStatus: "ACTIVE",
        employmentType: "FULL_TIME",
      }),
    ).rejects.toMatchObject({
      name: "StaffError",
      code: "NOT_FOUND",
    })

    expect(memory.tables.StaffProfile[0]).toMatchObject({
      firstName: "Ama",
      organizationId: ORG_B_ID,
    })
  })

  it("does not let Hospital A deactivate Hospital B's staff", async () => {
    authenticateAsB()
    const hospitalB = await createStaff({
      ...validCreate,
      departmentId: "dept-b",
      professionId: "prof-b",
    })

    authenticateAsA()
    await expect(deactivateStaff({ id: hospitalB.id })).rejects.toMatchObject({
      name: "StaffError",
      code: "NOT_FOUND",
    })
    expect(memory.tables.StaffProfile[0]?.employmentStatus).toBe("ACTIVE")
  })

  it("does not let Hospital A assign Hospital B's department", async () => {
    await expect(createStaff({ ...validCreate, departmentId: "dept-b" })).rejects.toMatchObject({
      name: "StaffError",
      code: "NOT_FOUND",
    })
    expect(memory.tables.StaffProfile).toHaveLength(0)
  })

  it("does not let Hospital A assign Hospital B's organization-specific profession", async () => {
    await expect(createStaff({ ...validCreate, professionId: "prof-b" })).rejects.toMatchObject({
      name: "StaffError",
      code: "NOT_FOUND",
    })
  })

  it("denies list when staff.view is missing", async () => {
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    seedStructure()
    grant(ROLE_A_ID, PERMISSION_IDS.create)
    authenticateAsA()

    await expect(listStaff()).rejects.toMatchObject({
      name: "StaffError",
      code: "FORBIDDEN",
    })
  })

  it("denies create when staff.create is missing", async () => {
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    seedStructure()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    authenticateAsA()

    await expect(createStaff(validCreate)).rejects.toMatchObject({
      name: "StaffError",
      code: "FORBIDDEN",
    })
    expect(memory.tables.StaffProfile).toHaveLength(0)
  })

  it("denies edit when staff.edit is missing", async () => {
    const staff = await createStaff(validCreate)
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    seedStructure()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    authenticateAsA()
    memory.insert("StaffProfile", { ...staff })

    await expect(
      updateStaff({
        id: staff.id,
        firstName: "Ama",
        lastName: "Boateng",
        professionId: "prof-global",
        departmentId: "dept-a",
        employmentStatus: "ACTIVE",
        employmentType: "FULL_TIME",
      }),
    ).rejects.toMatchObject({
      name: "StaffError",
      code: "FORBIDDEN",
    })
  })

  it("denies deactivation when staff.deactivate is missing", async () => {
    const staff = await createStaff(validCreate)
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    seedStructure()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    authenticateAsA()
    memory.insert("StaffProfile", { ...staff })

    await expect(deactivateStaff({ id: staff.id })).rejects.toMatchObject({
      name: "StaffError",
      code: "FORBIDDEN",
    })
  })

  it("creates valid staff without a User", async () => {
    const staff = await createStaff(validCreate)

    expect(staff).toMatchObject({
      firstName: "Ama",
      lastName: "Mensah",
      staffNumber: "NUR-001",
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      professionId: "prof-global",
      employmentStatus: "ACTIVE",
      employmentType: "FULL_TIME",
    })
    expect(staff.userId ?? null).toBeNull()
  })

  it("ignores client-supplied organizationId and userId on create", async () => {
    const staff = await createStaff({
      ...validCreate,
      organizationId: ORG_B_ID,
      userId: USER_B_ID,
    } as typeof validCreate & { organizationId: string; userId: string })

    expect(staff.organizationId).toBe(ORG_A_ID)
    expect(staff.userId ?? null).toBeNull()
  })

  it("rejects a duplicate staff number in the same organization", async () => {
    await createStaff(validCreate)

    await expect(
      createStaff({ ...validCreate, firstName: "Akosua" }),
    ).rejects.toMatchObject({
      name: "StaffError",
      code: "DUPLICATE",
    })
    expect(memory.tables.StaffProfile).toHaveLength(1)
  })

  it("rejects a case-insensitive duplicate staff number in the same organization", async () => {
    await createStaff(validCreate)

    await expect(
      createStaff({ ...validCreate, staffNumber: "nur-001", firstName: "Akosua" }),
    ).rejects.toMatchObject({
      name: "StaffError",
      code: "DUPLICATE",
    })
  })

  it("allows the same staff number in different organizations", async () => {
    await createStaff(validCreate)
    authenticateAsB()
    const hospitalB = await createStaff({
      ...validCreate,
      departmentId: "dept-b",
      professionId: "prof-b",
    })

    expect(hospitalB.organizationId).toBe(ORG_B_ID)
    expect(memory.tables.StaffProfile).toHaveLength(2)
  })

  it("rejects an invalid department", async () => {
    await expect(createStaff({ ...validCreate, departmentId: "missing" })).rejects.toMatchObject({
      name: "StaffError",
      code: "NOT_FOUND",
    })
  })

  it("accepts a global profession and a same-org profession", async () => {
    const globalStaff = await createStaff(validCreate)
    const orgStaff = await createStaff({
      ...validCreate,
      staffNumber: "NUR-002",
      professionId: "prof-a",
      firstName: "Yaw",
    })

    expect(globalStaff.professionId).toBe("prof-global")
    expect(orgStaff.professionId).toBe("prof-a")
  })

  it("rejects an inactive organization profession", async () => {
    await expect(
      createStaff({ ...validCreate, professionId: "prof-a-inactive" }),
    ).rejects.toMatchObject({
      name: "StaffError",
      code: "CONFLICT",
    })
  })

  it("lets staff be edited within the tenant", async () => {
    const staff = await createStaff(validCreate)
    const updated = await updateStaff({
      id: staff.id,
      firstName: "Ama",
      lastName: "Boateng",
      phone: "0244000000",
      professionId: "prof-a",
      departmentId: "dept-a",
      employmentStatus: "ON_LEAVE",
      employmentType: "PART_TIME",
    })

    expect(updated).toMatchObject({
      lastName: "Boateng",
      phone: "0244000000",
      professionId: "prof-a",
      employmentStatus: "ON_LEAVE",
      employmentType: "PART_TIME",
      staffNumber: "NUR-001",
    })
  })

  it("does not accept staffNumber on the update schema", () => {
    const parsed = updateStaffInputSchema.parse({
      id: "staff-1",
      firstName: "Ama",
      lastName: "Mensah",
      professionId: "prof-global",
      departmentId: "dept-a",
      employmentStatus: "ACTIVE",
      employmentType: "FULL_TIME",
      staffNumber: "CHANGED",
      organizationId: ORG_B_ID,
      userId: USER_B_ID,
    })

    expect(parsed).not.toHaveProperty("staffNumber")
    expect(parsed).not.toHaveProperty("organizationId")
    expect(parsed).not.toHaveProperty("userId")
  })

  it("preserves the staff record after deactivation", async () => {
    const staff = await createStaff(validCreate)
    const deactivated = await deactivateStaff({ id: staff.id })

    expect(deactivated.employmentStatus).toBe("TERMINATED")
    expect(memory.tables.StaffProfile).toHaveLength(1)
    const retrieved = await getStaff(staff.id)
    expect(retrieved).toMatchObject({
      id: staff.id,
      staffNumber: "NUR-001",
      firstName: "Ama",
      employmentStatus: "TERMINATED",
    })
  })

  it("strips ownership fields from the create schema", () => {
    const parsed = createStaffInputSchema.parse({
      firstName: "  Ama  ",
      lastName: "  Mensah  ",
      staffNumber: "  NUR-001  ",
      professionId: "prof-global",
      departmentId: "dept-a",
      organizationId: ORG_B_ID,
      userId: USER_B_ID,
      roleId: ROLE_B_ID,
      id: "client-id",
    })

    expect(parsed).toMatchObject({
      firstName: "Ama",
      lastName: "Mensah",
      staffNumber: "NUR-001",
      employmentStatus: "ACTIVE",
      employmentType: "FULL_TIME",
    })
    expect(parsed).not.toHaveProperty("organizationId")
    expect(parsed).not.toHaveProperty("userId")
    expect(parsed).not.toHaveProperty("roleId")
    expect(parsed).not.toHaveProperty("id")
  })

  it("links an existing same-org user through the server-side flow only", async () => {
    const staff = await createStaff(validCreate)
    const linked = await linkStaffToUser({ staffId: staff.id, userId: USER_A2_ID })

    expect(linked.userId).toBe(USER_A2_ID)
  })

  it("rejects cross-tenant user linkage", async () => {
    const staff = await createStaff(validCreate)

    await expect(linkStaffToUser({ staffId: staff.id, userId: USER_B_ID })).rejects.toMatchObject({
      name: "StaffError",
      code: "NOT_FOUND",
    })
    expect(memory.tables.StaffProfile[0]?.userId ?? null).toBeNull()
  })

  it("lets active same-department staff become department head", async () => {
    const staff = await createStaff(validCreate)
    const department = await assignDepartmentHead({
      departmentId: "dept-a",
      staffId: staff.id,
    })

    expect(department.headStaffId).toBe(staff.id)
    const retrieved = await getStaff(staff.id)
    expect(retrieved.isDepartmentHead).toBe(true)
  })

  it("does not let cross-tenant staff become department head", async () => {
    authenticateAsB()
    const hospitalB = await createStaff({
      ...validCreate,
      departmentId: "dept-b",
      professionId: "prof-b",
    })

    authenticateAsA()
    await expect(
      assignDepartmentHead({ departmentId: "dept-a", staffId: hospitalB.id }),
    ).rejects.toMatchObject({
      name: "StaffError",
      code: "NOT_FOUND",
    })
  })

  it("does not let staff from another department become department head", async () => {
    const staff = await createStaff({
      ...validCreate,
      departmentId: "dept-a-icu",
    })

    await expect(
      assignDepartmentHead({ departmentId: "dept-a", staffId: staff.id }),
    ).rejects.toMatchObject({
      name: "StaffError",
      code: "CONFLICT",
    })
  })

  it("does not let terminated staff become department head", async () => {
    const staff = await createStaff(validCreate)
    await deactivateStaff({ id: staff.id })

    await expect(
      assignDepartmentHead({ departmentId: "dept-a", staffId: staff.id }),
    ).rejects.toMatchObject({
      name: "StaffError",
      code: "CONFLICT",
    })
  })

  it("does not let a staff member head two departments", async () => {
    const staff = await createStaff(validCreate)
    await assignDepartmentHead({ departmentId: "dept-a", staffId: staff.id })

    await expect(
      assignDepartmentHead({ departmentId: "dept-a-icu", staffId: staff.id }),
    ).rejects.toMatchObject({
      name: "StaffError",
      code: "CONFLICT",
    })
  })

  it("clears the department head relationship when that staff member is deactivated", async () => {
    const staff = await createStaff(validCreate)
    await assignDepartmentHead({ departmentId: "dept-a", staffId: staff.id })

    await deactivateStaff({ id: staff.id })

    expect(memory.tables.Department.find((row) => row.id === "dept-a")?.headStaffId ?? null).toBeNull()
    expect(memory.tables.StaffProfile[0]?.employmentStatus).toBe("TERMINATED")
  })

  it("clears a dangling head reference when a department head is moved", async () => {
    const staff = await createStaff(validCreate)
    await assignDepartmentHead({ departmentId: "dept-a", staffId: staff.id })

    await updateStaff({
      id: staff.id,
      firstName: "Ama",
      lastName: "Mensah",
      professionId: "prof-global",
      departmentId: "dept-a-icu",
      employmentStatus: "ACTIVE",
      employmentType: "FULL_TIME",
    })

    expect(memory.tables.Department.find((row) => row.id === "dept-a")?.headStaffId ?? null).toBeNull()
    expect(memory.tables.StaffProfile[0]?.departmentId).toBe("dept-a-icu")
  })
})
