import { beforeEach, describe, expect, it, vi } from "vitest"

import { permissions } from "@/lib/permissions/permissions"

import { memory } from "./in-memory-orm"

const AUTH_USER_ID = "supabase-auth-user-1"
const USER_ID = "user-1"
const ORG_A_ID = "org-a"
const ORG_B_ID = "org-b"
const ROLE_A_ID = "role-a"
const ROLE_B_ID = "role-b"
const MEMBERSHIP_ID = "membership-1"
const STAFF_VIEW_ID = "perm-staff-view"
const STAFF_DEACTIVATE_ID = "perm-staff-deactivate"

const { getAuthUser, redirect } = vi.hoisted(() => {
  class RedirectError extends Error {
    readonly href: string

    constructor(href: string) {
      super(`NEXT_REDIRECT:${href}`)
      this.name = "RedirectError"
      this.href = href
    }
  }

  return {
    getAuthUser: vi.fn(),
    redirect: (href: string): never => {
      throw new RedirectError(href)
    },
  }
})

vi.mock("@/prisma/db", async () => {
  const { memory: testDb } = await import("./in-memory-orm")
  return { db: testDb.db }
})

vi.mock("@/lib/auth/get-auth-user", () => ({
  getAuthUser,
}))

vi.mock("next/navigation", () => ({
  redirect,
}))

import { getCurrentMembership } from "../get-current-membership"
import { getCurrentOrganization } from "../get-current-organization"
import { requirePermission } from "../require-permission"

function seedOrganizationsAndUser() {
  memory.insert("Organization", {
    id: ORG_A_ID,
    name: "Hospital A",
    slug: "hospital-a",
  })
  memory.insert("Organization", {
    id: ORG_B_ID,
    name: "Hospital B",
    slug: "hospital-b",
  })
  memory.insert("User", {
    id: USER_ID,
    authProviderId: AUTH_USER_ID,
    email: "nurse@test.local",
  })
  memory.insert("Role", {
    id: ROLE_A_ID,
    organizationId: ORG_A_ID,
    name: "Nurse",
  })
  memory.insert("Role", {
    id: ROLE_B_ID,
    organizationId: ORG_B_ID,
    name: "Administrator",
  })
}

function seedPermissionCatalog() {
  memory.insert("Permission", {
    id: STAFF_VIEW_ID,
    key: permissions.staffView,
  })
  memory.insert("Permission", {
    id: STAFF_DEACTIVATE_ID,
    key: permissions.staffDeactivate,
  })
}

function seedActiveMembership(roleId: string) {
  memory.insert("OrganizationMember", {
    id: MEMBERSHIP_ID,
    organizationId: ORG_A_ID,
    userId: USER_ID,
    roleId,
    status: "ACTIVE",
  })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function authenticate() {
  getAuthUser.mockResolvedValue({ id: AUTH_USER_ID })
}

async function expectRedirect(action: Promise<unknown>, href: string) {
  await expect(action).rejects.toMatchObject({
    name: "RedirectError",
    href,
  })
}

describe("authorization architecture", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    authenticate()
  })

  it("grants staff.view for an active same-tenant membership whose role has that permission", async () => {
    seedOrganizationsAndUser()
    seedPermissionCatalog()
    seedActiveMembership(ROLE_A_ID)
    grant(ROLE_A_ID, STAFF_VIEW_ID)
    grant(ROLE_B_ID, STAFF_VIEW_ID)
    grant(ROLE_B_ID, STAFF_DEACTIVATE_ID)

    const membership = await requirePermission(permissions.staffView)

    expect(membership.organizationId).toBe(ORG_A_ID)
    expect(membership.roleId).toBe(ROLE_A_ID)
    expect(membership.role.organizationId).toBe(ORG_A_ID)
    expect(membership.role.organizationId).toBe(membership.organizationId)
    expect(membership.organization.id).toBe(ORG_A_ID)

    expect(memory.queries).toContainEqual({
      model: "Role",
      where: { id: ROLE_A_ID, organizationId: ORG_A_ID },
      includes: [],
    })
    expect(memory.queries).toContainEqual({
      model: "Permission",
      where: { key: permissions.staffView },
      includes: [],
    })
    expect(memory.queries).toContainEqual({
      model: "RolePermission",
      where: { roleId: ROLE_A_ID, permissionId: STAFF_VIEW_ID },
      includes: [],
    })
    expect(
      memory.queries.some(
        (query) =>
          query.model === "Role" &&
          query.where.organizationId === ORG_B_ID,
      ),
    ).toBe(false)
  })

  it("denies staff.deactivate when the same role does not have that permission", async () => {
    seedOrganizationsAndUser()
    seedPermissionCatalog()
    seedActiveMembership(ROLE_A_ID)
    grant(ROLE_A_ID, STAFF_VIEW_ID)
    grant(ROLE_B_ID, STAFF_DEACTIVATE_ID)

    await expectRedirect(
      requirePermission(permissions.staffDeactivate),
      "/forbidden",
    )

    expect(memory.queries).toContainEqual({
      model: "Permission",
      where: { key: permissions.staffDeactivate },
      includes: [],
    })
    expect(memory.queries).toContainEqual({
      model: "RolePermission",
      where: { roleId: ROLE_A_ID, permissionId: STAFF_DEACTIVATE_ID },
      includes: [],
    })
    expect(
      memory.queries.some(
        (query) =>
          query.model === "RolePermission" &&
          query.where.roleId === ROLE_B_ID,
      ),
    ).toBe(false)
  })

  it("denies access when the active membership's role belongs to another organization", async () => {
    seedOrganizationsAndUser()
    seedPermissionCatalog()
    seedActiveMembership(ROLE_B_ID)
    grant(ROLE_B_ID, STAFF_VIEW_ID)
    grant(ROLE_B_ID, STAFF_DEACTIVATE_ID)

    const membership = await getCurrentMembership()

    expect(membership).toBeNull()
    await expectRedirect(requirePermission(permissions.staffView), "/onboarding")

    const memberQuery = memory.queries.find(
      (query) => query.model === "OrganizationMember",
    )
    expect(memberQuery?.where).toEqual({
      userId: USER_ID,
      status: "ACTIVE",
    })
    expect(memberQuery?.includes).toEqual(["organization", "role"])
    expect(
      memory.queries.some((query) => query.model === "RolePermission"),
    ).toBe(false)
  })

  it("denies access when the permission key does not exist in the Permission table", async () => {
    seedOrganizationsAndUser()
    seedActiveMembership(ROLE_A_ID)
    grant(ROLE_A_ID, STAFF_VIEW_ID)

    await expectRedirect(requirePermission(permissions.staffView), "/forbidden")

    expect(memory.queries).toContainEqual({
      model: "Permission",
      where: { key: permissions.staffView },
      includes: [],
    })
    expect(
      memory.queries.some((query) => query.model === "RolePermission"),
    ).toBe(false)
  })

  it("denies access when the authenticated user has no ACTIVE organization membership", async () => {
    seedOrganizationsAndUser()
    seedPermissionCatalog()
    grant(ROLE_A_ID, STAFF_VIEW_ID)
    memory.insert("OrganizationMember", {
      id: MEMBERSHIP_ID,
      organizationId: ORG_A_ID,
      userId: USER_ID,
      roleId: ROLE_A_ID,
      status: "INVITED",
    })

    expect(await getCurrentMembership()).toBeNull()
    await expectRedirect(requirePermission(permissions.staffView), "/onboarding")
    expect(
      memory.queries.some((query) => query.model === "RolePermission"),
    ).toBe(false)
  })

  it("returns only the organization attached to the active membership", async () => {
    seedOrganizationsAndUser()
    seedPermissionCatalog()
    seedActiveMembership(ROLE_A_ID)
    grant(ROLE_A_ID, STAFF_VIEW_ID)

    const organization = await getCurrentOrganization()

    expect(organization).toMatchObject({
      id: ORG_A_ID,
      name: "Hospital A",
      slug: "hospital-a",
    })
    expect(organization?.id).not.toBe(ORG_B_ID)
    expect(organization?.slug).not.toBe("hospital-b")
  })
})
