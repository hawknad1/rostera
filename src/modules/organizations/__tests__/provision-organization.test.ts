import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_NAMES,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/modules/organizations/default-roles"
import { provisionOrganizationInputSchema } from "@/modules/organizations/schemas/provision-organization"

const AUTH_USER_ID = "supabase-auth-user-1"
const OTHER_USER_ID = "another-user-id"

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

import { provisionOrganization } from "../services/provision-organization"

function authenticate(overrides?: { id?: string; email?: string | null; phone?: string | null }) {
  getAuthUser.mockResolvedValue({
    id: AUTH_USER_ID,
    email: "admin@hospital.test",
    phone: "+233200000000",
    ...overrides,
  })
}

function hospitalInput() {
  return {
    name: "Korle Bu Teaching Hospital",
    phone: "+233302739510",
    email: "admin@korlebu.test",
    address: "Guggisberg Avenue",
    city: "Accra",
    region: "Greater Accra",
    country: "Ghana",
    timezone: "Africa/Accra",
  }
}

function permissionKeysForRole(roleId: string) {
  return memory.tables.RolePermission.filter((row) => row.roleId === roleId)
    .map((row) => {
      const permission = memory.tables.Permission.find(
        (candidate) => candidate.id === row.permissionId,
      )
      return permission?.key
    })
    .filter((key): key is string => typeof key === "string")
    .sort()
}

describe("organization provisioning", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    authenticate()
  })

  it("lets a new authenticated user provision an organization as SUPER_ADMIN", async () => {
    const result = await provisionOrganization(hospitalInput())

    expect(result.user.authProviderId).toBe(AUTH_USER_ID)
    expect(result.user.email).toBe("admin@hospital.test")

    expect(result.organization).toMatchObject({
      name: "Korle Bu Teaching Hospital",
      slug: "korle-bu-teaching-hospital",
      country: "Ghana",
      timezone: "Africa/Accra",
      status: "ACTIVE",
      organizationType: "HOSPITAL",
    })

    expect(result.membership).toMatchObject({
      organizationId: result.organization.id,
      userId: result.user.id,
      roleId: result.role.id,
      status: "ACTIVE",
    })

    expect(result.role).toMatchObject({
      name: "SUPER_ADMIN",
      organizationId: result.organization.id,
      isSystem: true,
      isActive: true,
    })

    expect(memory.tables.User).toHaveLength(1)
    expect(memory.tables.OrganizationMember).toHaveLength(1)
    expect(memory.tables.OrganizationMember[0]?.status).toBe("ACTIVE")
  })

  it("creates every default role on the new organization", async () => {
    const result = await provisionOrganization(hospitalInput())

    const roleNames = memory.tables.Role.map((role) => role.name).sort()
    expect(roleNames).toEqual([...DEFAULT_ROLE_NAMES].sort())

    for (const role of memory.tables.Role) {
      expect(role.organizationId).toBe(result.organization.id)
    }
  })

  it("assigns SUPER_ADMIN every currently registered permission", async () => {
    const result = await provisionOrganization(hospitalInput())

    expect(permissionKeysForRole(result.role.id)).toEqual([...ALL_PERMISSIONS].sort())
  })

  it("attaches the explicit bootstrap permission mapping to each default role", async () => {
    await provisionOrganization(hospitalInput())

    for (const roleName of DEFAULT_ROLE_NAMES) {
      const role = memory.tables.Role.find((candidate) => candidate.name === roleName)
      expect(role).toBeDefined()
      expect(permissionKeysForRole(String(role?.id))).toEqual(
        [...DEFAULT_ROLE_PERMISSIONS[roleName]].sort(),
      )
    }
  })

  it("lets an existing member provision a second organization", async () => {
    const first = await provisionOrganization(hospitalInput())
    const second = await provisionOrganization({
      ...hospitalInput(),
      name: "Ridge Hospital",
    })

    expect(second.organization.id).not.toBe(first.organization.id)
    expect(second.membership.userId).toBe(first.user.id)
    expect(second.role.name).toBe("SUPER_ADMIN")
    expect(memory.tables.Organization).toHaveLength(2)
    expect(memory.tables.OrganizationMember).toHaveLength(2)
  })

  it("ignores client-supplied roleId, userId, and permissionKeys and still assigns SUPER_ADMIN", async () => {
    const parsed = provisionOrganizationInputSchema.parse({
      ...hospitalInput(),
      organizationName: "Hospital B",
      roleId: "some-non-super-admin-role",
      userId: OTHER_USER_ID,
      permissionKeys: [permissions.settingsEdit],
    })

    expect(parsed).not.toHaveProperty("roleId")
    expect(parsed).not.toHaveProperty("userId")
    expect(parsed).not.toHaveProperty("permissionKeys")
    expect(parsed).not.toHaveProperty("organizationName")

    const result = await provisionOrganization({
      ...parsed,
      roleId: "some-non-super-admin-role",
      userId: OTHER_USER_ID,
      permissionKeys: [permissions.settingsEdit],
    } as typeof parsed & {
      roleId: string
      userId: string
      permissionKeys: string[]
    })

    expect(result.user.authProviderId).toBe(AUTH_USER_ID)
    expect(result.user.id).not.toBe(OTHER_USER_ID)
    expect(result.role.name).toBe("SUPER_ADMIN")
    expect(result.membership.roleId).toBe(result.role.id)
    expect(permissionKeysForRole(result.role.id)).toEqual([...ALL_PERMISSIONS].sort())
    expect(permissionKeysForRole(result.role.id)).toContain(permissions.settingsEdit)
    expect(memory.tables.Role.some((role) => role.id === "some-non-super-admin-role")).toBe(
      false,
    )
  })

  it("does not duplicate permission definitions that already exist", async () => {
    memory.insert("Permission", {
      id: "perm-roster-view",
      key: permissions.rosterView,
    })
    memory.insert("Permission", {
      id: "perm-staff-view",
      key: permissions.staffView,
    })

    await provisionOrganization(hospitalInput())

    const keys = memory.tables.Permission.map((permission) => permission.key)
    expect(keys).toHaveLength(new Set(keys).size)
    expect(keys).toHaveLength(ALL_PERMISSIONS.length)
    expect(keys.filter((key) => key === permissions.rosterView)).toHaveLength(1)
    expect(keys.filter((key) => key === permissions.staffView)).toHaveLength(1)
  })

  it("handles slug collisions with a deterministic suffix", async () => {
    memory.insert("Organization", {
      id: "existing-org",
      name: "Existing Hospital",
      slug: "korle-bu-teaching-hospital",
    })

    const result = await provisionOrganization(hospitalInput())

    expect(result.organization.slug).toBe("korle-bu-teaching-hospital-2")
    expect(
      memory.tables.Organization.filter(
        (organization) => organization.slug === "korle-bu-teaching-hospital",
      ),
    ).toHaveLength(1)
  })

  it("does not report success when provisioning fails mid-flow", async () => {
    memory.failNextCreate("OrganizationMember")

    await expect(provisionOrganization(hospitalInput())).rejects.toMatchObject({
      name: "OrganizationProvisioningError",
      code: "PROVISIONING_FAILED",
    })

    expect(memory.tables.Organization).toHaveLength(0)
    expect(memory.tables.OrganizationMember).toHaveLength(0)
    expect(memory.tables.Role).toHaveLength(0)
    expect(memory.tables.RolePermission).toHaveLength(0)
    expect(memory.tables.User).toHaveLength(0)
  })

  it("rejects unauthenticated provisioning without writing records", async () => {
    getAuthUser.mockResolvedValue(null)

    await expect(provisionOrganization(hospitalInput())).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    })

    expect(memory.tables.Organization).toHaveLength(0)
    expect(memory.tables.User).toHaveLength(0)
  })
})
