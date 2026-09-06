import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createProfessionInputSchema } from "@/modules/professions/schemas/profession"
import {
  createOrganizationProfession,
  deactivateOrganizationProfession,
  listProfessions,
  updateOrganizationProfession,
} from "@/modules/professions/services/professions"

const AUTH_USER_A = "supabase-auth-user-a"
const AUTH_USER_B = "supabase-auth-user-b"
const USER_A_ID = "user-a"
const USER_B_ID = "user-b"
const ORG_A_ID = "org-a"
const ORG_B_ID = "org-b"
const ROLE_A_ID = "role-a"
const ROLE_B_ID = "role-b"
const GLOBAL_PROFESSION_ID = "profession-global"
const ORG_B_PROFESSION_ID = "profession-b"

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

function seedGlobalProfession() {
  memory.insert("Profession", {
    id: GLOBAL_PROFESSION_ID,
    organizationId: null,
    name: "Registered Nurse",
    description: "Global catalog",
    isActive: true,
  })
}

describe("profession services", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seedPermissionCatalog()
    seedHospitals()
    grantAll(ROLE_A_ID)
    grantAll(ROLE_B_ID)
    seedGlobalProfession()
    authenticateAsA()
  })

  it("lets a hospital user view global professions", async () => {
    const result = await listProfessions()

    expect(result.global).toEqual([
      expect.objectContaining({
        id: GLOBAL_PROFESSION_ID,
        organizationId: null,
        name: "Registered Nurse",
      }),
    ])
  })

  it("does not let a hospital user edit a global profession", async () => {
    await expect(
      updateOrganizationProfession({
        id: GLOBAL_PROFESSION_ID,
        name: "Hijacked Nurse",
      }),
    ).rejects.toMatchObject({
      name: "ProfessionError",
      code: "FORBIDDEN",
    })

    expect(memory.tables.Profession.find((row) => row.id === GLOBAL_PROFESSION_ID)).toMatchObject({
      name: "Registered Nurse",
      organizationId: null,
    })
  })

  it("does not let a hospital user deactivate a global profession", async () => {
    await expect(
      deactivateOrganizationProfession({ id: GLOBAL_PROFESSION_ID }),
    ).rejects.toMatchObject({
      name: "ProfessionError",
      code: "FORBIDDEN",
    })

    expect(memory.tables.Profession.find((row) => row.id === GLOBAL_PROFESSION_ID)).toMatchObject({
      isActive: true,
      organizationId: null,
    })
  })

  it("lets a hospital user create an organization-specific profession", async () => {
    const profession = await createOrganizationProfession({
      name: "Medical Officer",
      description: "Hospital cadre",
      organizationId: ORG_B_ID,
      userId: USER_B_ID,
    } as { name: string; description: string } & { organizationId: string; userId: string })

    expect(profession).toMatchObject({
      name: "Medical Officer",
      description: "Hospital cadre",
      organizationId: ORG_A_ID,
      isActive: true,
    })
    expect(profession.organizationId).not.toBe(ORG_B_ID)
  })

  it("lets a hospital user edit their organization's profession", async () => {
    const created = await createOrganizationProfession({ name: "Pharmacist" })

    const updated = await updateOrganizationProfession({
      id: created.id,
      name: "Clinical Pharmacist",
      description: "Ward pharmacy",
    })

    expect(updated).toMatchObject({
      id: created.id,
      organizationId: ORG_A_ID,
      name: "Clinical Pharmacist",
      description: "Ward pharmacy",
    })
  })

  it("lets a hospital user deactivate their organization's profession", async () => {
    const created = await createOrganizationProfession({ name: "Midwife" })

    const updated = await deactivateOrganizationProfession({ id: created.id })

    expect(updated).toMatchObject({
      id: created.id,
      organizationId: ORG_A_ID,
      isActive: false,
    })
  })

  it("does not let Hospital A modify Hospital B's profession", async () => {
    memory.insert("Profession", {
      id: ORG_B_PROFESSION_ID,
      organizationId: ORG_B_ID,
      name: "Laboratory Scientist",
      isActive: true,
    })

    await expect(
      updateOrganizationProfession({
        id: ORG_B_PROFESSION_ID,
        name: "Hijacked Scientist",
      }),
    ).rejects.toMatchObject({
      name: "ProfessionError",
      code: "NOT_FOUND",
    })

    await expect(
      deactivateOrganizationProfession({ id: ORG_B_PROFESSION_ID }),
    ).rejects.toMatchObject({
      name: "ProfessionError",
      code: "NOT_FOUND",
    })

    expect(memory.tables.Profession.find((row) => row.id === ORG_B_PROFESSION_ID)).toMatchObject({
      name: "Laboratory Scientist",
      organizationId: ORG_B_ID,
      isActive: true,
    })
  })

  it("rejects a duplicate organization-specific profession name, including inactive names", async () => {
    const created = await createOrganizationProfession({ name: "Radiographer" })
    await deactivateOrganizationProfession({ id: created.id })

    await expect(createOrganizationProfession({ name: "Radiographer" })).rejects.toMatchObject({
      name: "ProfessionError",
      code: "DUPLICATE",
    })

    authenticateAsB()
    const hospitalB = await createOrganizationProfession({ name: "Radiographer" })
    expect(hospitalB.organizationId).toBe(ORG_B_ID)
  })

  it("ignores client-supplied organizationId and userId on the input schema", () => {
    const parsed = createProfessionInputSchema.parse({
      name: "  Medical Officer  ",
      organizationId: ORG_B_ID,
      userId: USER_B_ID,
      roleId: ROLE_B_ID,
    })

    expect(parsed).toEqual({ name: "Medical Officer" })
    expect(parsed).not.toHaveProperty("organizationId")
    expect(parsed).not.toHaveProperty("userId")
    expect(parsed).not.toHaveProperty("roleId")
  })

  it("derives identity and organization from server-side authentication", async () => {
    await createOrganizationProfession({ name: "Anaesthetist" })

    expect(memory.tables.Profession.some((row) => row.organizationId === ORG_A_ID)).toBe(true)
    expect(
      memory.queries.some(
        (query) =>
          query.model === "OrganizationMember" &&
          query.where.userId === USER_A_ID &&
          query.where.status === "ACTIVE",
      ),
    ).toBe(true)
  })
})
