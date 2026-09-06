import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createDepartmentInputSchema } from "@/modules/departments/schemas/department"
import {
  createDepartment,
  deleteDepartment,
  getDepartment,
  listDepartments,
  updateDepartment,
} from "@/modules/departments/services/departments"

const AUTH_USER_A = "supabase-auth-user-a"
const AUTH_USER_B = "supabase-auth-user-b"
const USER_A_ID = "user-a"
const USER_B_ID = "user-b"
const ORG_A_ID = "org-a"
const ORG_B_ID = "org-b"
const ROLE_A_ID = "role-a"
const ROLE_B_ID = "role-b"

const PERMISSION_IDS = {
  view: "perm-department-view",
  create: "perm-department-create",
  edit: "perm-department-edit",
  delete: "perm-department-delete",
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
  memory.insert("Permission", { id: PERMISSION_IDS.view, key: permissions.departmentView })
  memory.insert("Permission", { id: PERMISSION_IDS.create, key: permissions.departmentCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.edit, key: permissions.departmentEdit })
  memory.insert("Permission", { id: PERMISSION_IDS.delete, key: permissions.departmentDelete })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function grantAll(roleId: string) {
  grant(roleId, PERMISSION_IDS.view)
  grant(roleId, PERMISSION_IDS.create)
  grant(roleId, PERMISSION_IDS.edit)
  grant(roleId, PERMISSION_IDS.delete)
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

describe("department services", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seedPermissionCatalog()
    seedHospitals()
    grantAll(ROLE_A_ID)
    grantAll(ROLE_B_ID)
    authenticateAsA()
  })

  it("lets an authenticated user with department.create create a department", async () => {
    const department = await createDepartment({
      name: "Emergency",
      description: "Accident and emergency",
    })

    expect(department).toMatchObject({
      name: "Emergency",
      description: "Accident and emergency",
      organizationId: ORG_A_ID,
    })
    expect(memory.tables.Department).toHaveLength(1)
  })

  it("takes organizationId from the active membership, not client input", async () => {
    const department = await createDepartment({
      name: "ICU",
      organizationId: ORG_B_ID,
      userId: USER_B_ID,
    } as { name: string } & { organizationId: string; userId: string })

    expect(department.organizationId).toBe(ORG_A_ID)
    expect(department.organizationId).not.toBe(ORG_B_ID)
    expect(memory.tables.Department[0]?.organizationId).toBe(ORG_A_ID)
  })

  it("does not let a Hospital A user create a department in Hospital B", async () => {
    await createDepartment({
      name: "Maternity",
      organizationId: ORG_B_ID,
    } as { name: string } & { organizationId: string })

    expect(memory.tables.Department.every((row) => row.organizationId === ORG_A_ID)).toBe(true)
    expect(memory.tables.Department.some((row) => row.organizationId === ORG_B_ID)).toBe(false)
  })

  it("does not let a Hospital A user read Hospital B's department", async () => {
    memory.insert("Department", {
      id: "dept-b",
      organizationId: ORG_B_ID,
      name: "Emergency",
    })

    await expect(getDepartment("dept-b")).rejects.toMatchObject({
      name: "DepartmentError",
      code: "NOT_FOUND",
    })
  })

  it("does not let a Hospital A user update Hospital B's department", async () => {
    memory.insert("Department", {
      id: "dept-b",
      organizationId: ORG_B_ID,
      name: "Emergency",
    })

    await expect(
      updateDepartment({ id: "dept-b", name: "Hijacked Emergency" }),
    ).rejects.toMatchObject({
      name: "DepartmentError",
      code: "NOT_FOUND",
    })

    expect(memory.tables.Department[0]).toMatchObject({
      id: "dept-b",
      organizationId: ORG_B_ID,
      name: "Emergency",
    })
  })

  it("does not let a Hospital A user delete Hospital B's department", async () => {
    memory.insert("Department", {
      id: "dept-b",
      organizationId: ORG_B_ID,
      name: "Emergency",
    })

    await expect(deleteDepartment({ id: "dept-b" })).rejects.toMatchObject({
      name: "DepartmentError",
      code: "NOT_FOUND",
    })

    expect(memory.tables.Department).toHaveLength(1)
  })

  it("rejects a duplicate department name within the same organization", async () => {
    await createDepartment({ name: "Emergency" })

    await expect(createDepartment({ name: "Emergency" })).rejects.toMatchObject({
      name: "DepartmentError",
      code: "DUPLICATE",
    })

    expect(memory.tables.Department).toHaveLength(1)
  })

  it("allows the same department name in two organizations", async () => {
    await createDepartment({ name: "Emergency" })

    authenticateAsB()
    const hospitalB = await createDepartment({ name: "Emergency" })

    expect(hospitalB.organizationId).toBe(ORG_B_ID)
    expect(memory.tables.Department).toHaveLength(2)
    expect(
      memory.tables.Department.filter((row) => row.name === "Emergency").map(
        (row) => row.organizationId,
      ),
    ).toEqual(expect.arrayContaining([ORG_A_ID, ORG_B_ID]))
  })

  it("denies create when department.create is missing", async () => {
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    authenticateAsA()

    await expect(createDepartment({ name: "Emergency" })).rejects.toMatchObject({
      name: "DepartmentError",
      code: "FORBIDDEN",
    })

    expect(memory.tables.Department).toHaveLength(0)
  })

  it("denies view when department.view is missing", async () => {
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.create)
    authenticateAsA()

    await expect(listDepartments()).rejects.toMatchObject({
      name: "DepartmentError",
      code: "FORBIDDEN",
    })
  })

  it("ignores client-supplied organizationId and userId on the input schema", () => {
    const parsed = createDepartmentInputSchema.parse({
      name: "  Paediatrics  ",
      description: "  Children's ward  ",
      organizationId: ORG_B_ID,
      userId: USER_B_ID,
      roleId: ROLE_B_ID,
    })

    expect(parsed).toEqual({
      name: "Paediatrics",
      description: "Children's ward",
    })
    expect(parsed).not.toHaveProperty("organizationId")
    expect(parsed).not.toHaveProperty("userId")
    expect(parsed).not.toHaveProperty("roleId")
  })

  it("derives identity and organization from server-side authentication", async () => {
    const department = await createDepartment({ name: "OPD" })

    expect(department.organizationId).toBe(ORG_A_ID)
    expect(
      memory.queries.some(
        (query) =>
          query.model === "OrganizationMember" &&
          query.where.userId === USER_A_ID &&
          query.where.status === "ACTIVE",
      ),
    ).toBe(true)
    expect(memory.tables.Department[0]?.organizationId).toBe(ORG_A_ID)
    expect(
      memory.tables.Department.some((row) => row.organizationId === ORG_B_ID),
    ).toBe(false)
  })
})
