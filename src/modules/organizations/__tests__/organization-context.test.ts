import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"

const AUTH_A = "supabase-auth-a"
const AUTH_B = "supabase-auth-b"
const USER_A = "user-a"
const USER_B = "user-b"
const ORG_A = "org-a"
const ORG_B = "org-b"
const ROLE_A = "role-a"
const ROLE_B = "role-b"

const cookieStore = vi.hoisted(() => {
  const values = new Map<string, string>()
  return {
    values,
    get(name: string) {
      const value = values.get(name)
      return value === undefined ? undefined : { value }
    },
    set(name: string, value: string) {
      values.set(name, value)
    },
    delete(name: string) {
      values.delete(name)
    },
    reset() {
      values.clear()
    },
  }
})

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

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}))

import {
  getCurrentMembership,
  resolveMembership,
  setActiveOrganization,
} from "@/lib/auth/get-current-membership"
import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/auth/active-organization"

function seed() {
  memory.insert("Permission", { id: "perm-org-edit", key: permissions.organizationEdit })
  memory.insert("Organization", { id: ORG_A, name: "Hospital A", slug: "hospital-a", status: "ACTIVE" })
  memory.insert("Organization", { id: ORG_B, name: "Hospital B", slug: "hospital-b", status: "ACTIVE" })
  memory.insert("User", { id: USER_A, authProviderId: AUTH_A, email: "a@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })
  memory.insert("Role", { id: ROLE_A, organizationId: ORG_A, name: "SUPER_ADMIN", isSystem: true })
  memory.insert("Role", { id: ROLE_B, organizationId: ORG_B, name: "SUPER_ADMIN", isSystem: true })
}

describe("active organization resolution", () => {
  beforeEach(() => {
    memory.reset()
    cookieStore.reset()
    getAuthUser.mockReset()
    seed()
  })

  it("uses the only active membership automatically", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_A })
    memory.insert("OrganizationMember", {
      id: "mem-a",
      organizationId: ORG_A,
      userId: USER_A,
      roleId: ROLE_A,
      status: "ACTIVE",
    })

    const resolved = await resolveMembership()
    expect(resolved.status).toBe("ready")
    if (resolved.status === "ready") {
      expect(resolved.membership.organizationId).toBe(ORG_A)
    }
  })

  it("does not guess when the user has multiple operational organizations", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_A })
    memory.insert("OrganizationMember", {
      id: "mem-a",
      organizationId: ORG_A,
      userId: USER_A,
      roleId: ROLE_A,
      status: "ACTIVE",
    })
    memory.insert("OrganizationMember", {
      id: "mem-ab",
      organizationId: ORG_B,
      userId: USER_A,
      roleId: ROLE_B,
      status: "ACTIVE",
    })

    const resolved = await resolveMembership()
    expect(resolved.status).toBe("needs_selection")
    expect(await getCurrentMembership()).toBeNull()
  })

  it("uses a validated cookie when the user has multiple organizations", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_A })
    memory.insert("OrganizationMember", {
      id: "mem-a",
      organizationId: ORG_A,
      userId: USER_A,
      roleId: ROLE_A,
      status: "ACTIVE",
    })
    memory.insert("OrganizationMember", {
      id: "mem-ab",
      organizationId: ORG_B,
      userId: USER_A,
      roleId: ROLE_B,
      status: "ACTIVE",
    })
    cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, ORG_B)

    const membership = await getCurrentMembership()
    expect(membership?.organizationId).toBe(ORG_B)
  })

  it("ignores a cookie for an organization the user does not belong to", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_A })
    memory.insert("OrganizationMember", {
      id: "mem-a",
      organizationId: ORG_A,
      userId: USER_A,
      roleId: ROLE_A,
      status: "ACTIVE",
    })
    cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, ORG_B)

    const membership = await getCurrentMembership()
    expect(membership?.organizationId).toBe(ORG_A)
  })

  it("does not treat an inactive membership as selectable", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_A })
    memory.insert("OrganizationMember", {
      id: "mem-a",
      organizationId: ORG_A,
      userId: USER_A,
      roleId: ROLE_A,
      status: "SUSPENDED",
    })
    cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, ORG_A)

    expect(await resolveMembership()).toMatchObject({ status: "no_membership" })
    expect(await setActiveOrganization(ORG_A)).toBeNull()
  })

  it("returns no membership when the user has none", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_A })
    expect(await resolveMembership()).toMatchObject({ status: "no_membership" })
  })

  it("blocks operational membership when the selected organization is suspended", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_A })
    memory.insert("OrganizationMember", {
      id: "mem-a",
      organizationId: ORG_A,
      userId: USER_A,
      roleId: ROLE_A,
      status: "ACTIVE",
    })
    memory.tables.Organization[0]!.status = "SUSPENDED"

    const resolved = await resolveMembership()
    expect(resolved.status).toBe("suspended")
    expect(await getCurrentMembership()).toBeNull()
  })

  it("rejects switching into another tenant", async () => {
    getAuthUser.mockResolvedValue({ id: AUTH_A })
    memory.insert("OrganizationMember", {
      id: "mem-a",
      organizationId: ORG_A,
      userId: USER_A,
      roleId: ROLE_A,
      status: "ACTIVE",
    })
    memory.insert("OrganizationMember", {
      id: "mem-b",
      organizationId: ORG_B,
      userId: USER_B,
      roleId: ROLE_B,
      status: "ACTIVE",
    })

    expect(await setActiveOrganization(ORG_B)).toBeNull()
    expect(await getCurrentMembership()).toMatchObject({ organizationId: ORG_A })
  })
})
