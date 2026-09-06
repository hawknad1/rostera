import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { DEFAULT_ROLE_PERMISSIONS } from "@/modules/organizations/default-roles"

const AUTH_STAFF = "supabase-auth-staff"
const AUTH_SUPERVISOR = "supabase-auth-supervisor"
const AUTH_HR = "supabase-auth-hr"
const AUTH_MANAGER = "supabase-auth-manager"
const AUTH_ADMIN = "supabase-auth-admin"

const USER_STAFF = "user-staff"
const USER_SUPERVISOR = "user-supervisor"
const USER_HR = "user-hr"
const USER_MANAGER = "user-manager"
const USER_ADMIN = "user-admin"

const ORG_A = "org-a"

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
  const { memory: testDb } = await import("@/lib/auth/__tests__/in-memory-orm")
  return { db: testDb.db }
})

vi.mock("@/lib/auth/get-auth-user", () => ({
  getAuthUser,
}))

vi.mock("next/navigation", () => ({
  redirect,
}))

import { hasAdminSurfaceAccess, requireAdminSurface } from "@/lib/auth/admin-surface"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"

function authenticate(authProviderId: string) {
  getAuthUser.mockResolvedValue({ id: authProviderId })
}

async function expectRedirect(action: Promise<unknown>, href: string) {
  await expect(action).rejects.toMatchObject({
    name: "RedirectError",
    href,
  })
}

function grantRole(roleId: string, keys: readonly string[]) {
  for (const key of keys) {
    const permission = memory.tables.Permission.find((row) => row.key === key)
    if (!permission) {
      throw new Error(`Missing permission ${key}`)
    }

    memory.insert("RolePermission", { roleId, permissionId: permission.id })
  }
}

function seed() {
  for (const key of Object.values(permissions)) {
    memory.insert("Permission", { id: `perm-${key}`, key })
  }

  memory.insert("Organization", { id: ORG_A, name: "Hospital A", slug: "hospital-a" })

  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "ama@test.local" })
  memory.insert("User", {
    id: USER_SUPERVISOR,
    authProviderId: AUTH_SUPERVISOR,
    email: "super@test.local",
  })
  memory.insert("User", { id: USER_HR, authProviderId: AUTH_HR, email: "hr@test.local" })
  memory.insert("User", {
    id: USER_MANAGER,
    authProviderId: AUTH_MANAGER,
    email: "manager@test.local",
  })
  memory.insert("User", { id: USER_ADMIN, authProviderId: AUTH_ADMIN, email: "admin@test.local" })

  memory.insert("Role", { id: "role-staff", organizationId: ORG_A, name: "STAFF" })
  memory.insert("Role", { id: "role-supervisor", organizationId: ORG_A, name: "SUPERVISOR" })
  memory.insert("Role", { id: "role-hr", organizationId: ORG_A, name: "HR" })
  memory.insert("Role", { id: "role-manager", organizationId: ORG_A, name: "ROSTER_MANAGER" })
  memory.insert("Role", { id: "role-admin", organizationId: ORG_A, name: "SUPER_ADMIN" })

  grantRole("role-staff", DEFAULT_ROLE_PERMISSIONS.STAFF)
  grantRole("role-supervisor", DEFAULT_ROLE_PERMISSIONS.SUPERVISOR)
  grantRole("role-hr", DEFAULT_ROLE_PERMISSIONS.HR)
  grantRole("role-manager", DEFAULT_ROLE_PERMISSIONS.ROSTER_MANAGER)
  grantRole("role-admin", DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN)

  memory.insert("OrganizationMember", {
    id: "membership-staff",
    organizationId: ORG_A,
    userId: USER_STAFF,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-supervisor",
    organizationId: ORG_A,
    userId: USER_SUPERVISOR,
    roleId: "role-supervisor",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-hr",
    organizationId: ORG_A,
    userId: USER_HR,
    roleId: "role-hr",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-manager",
    organizationId: ORG_A,
    userId: USER_MANAGER,
    roleId: "role-manager",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-admin",
    organizationId: ORG_A,
    userId: USER_ADMIN,
    roleId: "role-admin",
    status: "ACTIVE",
  })
}

describe("administrative surface guard", () => {
  beforeEach(() => {
    memory.reset()
    seed()
  })

  it("blocks STAFF from administrative surfaces including /rosters, /staff, /settings, and /audit", async () => {
    authenticate(AUTH_STAFF)
    const membership = await getCurrentMembership()
    expect(membership).not.toBeNull()
    await expect(hasAdminSurfaceAccess(membership!)).resolves.toBe(false)
    await expectRedirect(requireAdminSurface(), "/forbidden")
  })

  it("allows SUPERVISOR into the administrative application", async () => {
    authenticate(AUTH_SUPERVISOR)
    const membership = await requireAdminSurface()
    expect(membership.roleId).toBe("role-supervisor")
    await expect(hasAdminSurfaceAccess(membership)).resolves.toBe(true)
  })

  it("allows HR into the administrative application", async () => {
    authenticate(AUTH_HR)
    const membership = await requireAdminSurface()
    expect(membership.roleId).toBe("role-hr")
  })

  it("allows ROSTER_MANAGER into the administrative application", async () => {
    authenticate(AUTH_MANAGER)
    const membership = await requireAdminSurface()
    expect(membership.roleId).toBe("role-manager")
  })

  it("allows SUPER_ADMIN into the administrative application", async () => {
    authenticate(AUTH_ADMIN)
    const membership = await requireAdminSurface()
    expect(membership.roleId).toBe("role-admin")
  })

  it("does not use the role name STAFF as the only signal", async () => {
    memory.insert("Role", { id: "role-custom", organizationId: ORG_A, name: "WARD_CLERK" })
    grantRole("role-custom", DEFAULT_ROLE_PERMISSIONS.STAFF)
    memory.insert("User", {
      id: "user-clerk",
      authProviderId: "supabase-auth-clerk",
      email: "clerk@test.local",
    })
    memory.insert("OrganizationMember", {
      id: "membership-clerk",
      organizationId: ORG_A,
      userId: "user-clerk",
      roleId: "role-custom",
      status: "ACTIVE",
    })

    authenticate("supabase-auth-clerk")
    await expectRedirect(requireAdminSurface(), "/forbidden")
  })
})
