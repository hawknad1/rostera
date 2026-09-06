import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { deleteDepartment } from "@/modules/departments/services/departments"
import { createRosterInputSchema } from "@/modules/rosters/schemas/roster"
import {
  createRoster,
  getRoster,
  listRosters,
  updateRoster,
} from "@/modules/rosters/services/rosters"

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
  memory.insert("Permission", { id: PERMISSION_IDS.view, key: permissions.rosterView })
  memory.insert("Permission", { id: PERMISSION_IDS.create, key: permissions.rosterCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.edit, key: permissions.rosterEdit })
  memory.insert("Permission", {
    id: PERMISSION_IDS.departmentDelete,
    key: permissions.departmentDelete,
  })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function grantRosterAll(roleId: string) {
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
}

const validCreate = {
  name: "September 2026 — Emergency Department",
  departmentId: "dept-a",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
}

describe("roster services", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seedPermissionCatalog()
    seedHospitals()
    grantRosterAll(ROLE_A_ID)
    grantRosterAll(ROLE_B_ID)
    authenticateAsA()
  })

  it("lets an authorized user create a draft roster", async () => {
    const roster = await createRoster(validCreate)

    expect(roster).toMatchObject({
      name: validCreate.name,
      departmentId: "dept-a",
      organizationId: ORG_A_ID,
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      status: "DRAFT",
      createdByUserId: USER_A_ID,
    })
  })

  it("rejects a start date after the end date", () => {
    expect(
      createRosterInputSchema.safeParse({
        ...validCreate,
        startDate: "2026-09-30",
        endDate: "2026-09-01",
      }).success,
    ).toBe(false)
  })

  it("rejects a missing department", async () => {
    await expect(
      createRoster({
        ...validCreate,
        departmentId: "missing",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "DEPARTMENT_NOT_FOUND",
    })
  })

  it("rejects a department from another organization", async () => {
    await expect(
      createRoster({
        ...validCreate,
        departmentId: "dept-b",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "DEPARTMENT_NOT_FOUND",
    })
  })

  it("requires roster.create", async () => {
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    authenticateAsA()

    await expect(createRoster(validCreate)).rejects.toMatchObject({
      name: "RosterError",
      code: "FORBIDDEN",
    })
  })

  it("strips client-supplied organizationId and createdByUserId", () => {
    const parsed = createRosterInputSchema.parse({
      ...validCreate,
      organizationId: ORG_B_ID,
      createdByUserId: USER_B_ID,
      status: "PUBLISHED",
    })

    expect(parsed).toEqual(validCreate)
  })

  it("sets createdByUserId from the authenticated application user", async () => {
    const roster = await createRoster(validCreate)
    expect(roster.createdByUserId).toBe(USER_A_ID)
    expect(roster.organizationId).toBe(ORG_A_ID)
  })

  it("does not let a non-draft roster be edited", async () => {
    memory.insert("Roster", {
      id: "roster-published",
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      name: "Published roster",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      status: "PUBLISHED",
      createdByUserId: USER_A_ID,
    })

    await expect(
      updateRoster({
        id: "roster-published",
        name: "Changed",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      }),
    ).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_DRAFT",
    })
  })

  it("does not let Hospital A list or get Hospital B's roster", async () => {
    authenticateAsB()
    const hospitalB = await createRoster({
      ...validCreate,
      departmentId: "dept-b",
    })

    authenticateAsA()
    const listed = await listRosters()
    expect(listed).toHaveLength(0)

    await expect(getRoster(hospitalB.id)).rejects.toMatchObject({
      name: "RosterError",
      code: "ROSTER_NOT_FOUND",
    })
  })

  it("requires roster.view to list rosters", async () => {
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.create)
    authenticateAsA()

    await expect(listRosters()).rejects.toMatchObject({
      name: "RosterError",
      code: "FORBIDDEN",
    })
  })

  it("lets a draft roster be updated", async () => {
    const created = await createRoster(validCreate)
    const updated = await updateRoster({
      id: created.id,
      name: "Updated name",
      startDate: "2026-09-02",
      endDate: "2026-09-15",
    })

    expect(updated).toMatchObject({
      name: "Updated name",
      startDate: "2026-09-02",
      endDate: "2026-09-15",
      departmentId: "dept-a",
    })
  })

  it("does not let a department be deleted while it has a roster", async () => {
    grant(ROLE_A_ID, PERMISSION_IDS.departmentDelete)
    await createRoster(validCreate)

    await expect(deleteDepartment({ id: "dept-a" })).rejects.toMatchObject({
      name: "DepartmentError",
      code: "IN_USE",
    })
  })
})
