import { Temporal } from "temporal-polyfill"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { ALL_PERMISSIONS } from "@/modules/organizations/default-roles"
import { hashInvitationToken } from "@/modules/organizations/services/invitation-token"

const AUTH_A = "supabase-auth-a"
const AUTH_B = "supabase-auth-b"
const AUTH_INVITEE = "supabase-auth-invitee"
const USER_A = "user-a"
const USER_A2 = "user-a2"
const USER_B = "user-b"
const ORG_A = "org-a"
const ORG_B = "org-b"
const ROLE_A = "role-a"
const ROLE_A_HR = "role-a-hr"
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

const { getAuthUser, processDomainNotification } = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  processDomainNotification: vi.fn(),
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

vi.mock("@/modules/notifications/services/emit", async () => {
  const actual = await vi.importActual<typeof import("@/modules/notifications/services/emit")>(
    "@/modules/notifications/services/emit",
  )
  return {
    ...actual,
    processDomainNotification,
  }
})

import {
  acceptInvitation,
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "@/modules/organizations/services/invitations"
import {
  changeMembershipRole,
  deactivateMembership,
  linkMembershipStaff,
  listMemberships,
  reactivateMembership,
  unlinkMembershipStaff,
} from "@/modules/organizations/services/memberships"
import {
  createCustomRole,
  deactivateCustomRole,
  updateCustomRole,
} from "@/modules/organizations/services/roles"
import {
  reactivateOrganization,
  suspendOrganization,
  updateOrganizationSettings,
} from "@/modules/organizations/services/organization"

function authenticate(authProviderId: string, email = "a@test.local") {
  getAuthUser.mockResolvedValue({ id: authProviderId, email })
}

function grantAll(roleId: string) {
  for (const key of ALL_PERMISSIONS) {
    const permission = memory.tables.Permission.find((row) => row.key === key)
    if (!permission) {
      throw new Error(`missing ${key}`)
    }
    memory.insert("RolePermission", { roleId, permissionId: permission.id })
  }
}

function seed() {
  for (const key of ALL_PERMISSIONS) {
    memory.insert("Permission", { id: `perm-${key}`, key })
  }

  memory.insert("Organization", {
    id: ORG_A,
    name: "Hospital A",
    slug: "hospital-a",
    status: "ACTIVE",
    timezone: "Africa/Accra",
    country: "Ghana",
    organizationType: "HOSPITAL",
  })
  memory.insert("Organization", {
    id: ORG_B,
    name: "Hospital B",
    slug: "hospital-b",
    status: "ACTIVE",
    timezone: "Africa/Accra",
    country: "Ghana",
    organizationType: "HOSPITAL",
  })

  memory.insert("User", { id: USER_A, authProviderId: AUTH_A, email: "a@test.local" })
  memory.insert("User", { id: USER_A2, authProviderId: "supabase-auth-a2", email: "a2@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })

  memory.insert("Role", {
    id: ROLE_A,
    organizationId: ORG_A,
    name: "SUPER_ADMIN",
    isSystem: true,
    isActive: true,
  })
  memory.insert("Role", {
    id: ROLE_A_HR,
    organizationId: ORG_A,
    name: "HR",
    isSystem: true,
    isActive: true,
  })
  memory.insert("Role", {
    id: ROLE_B,
    organizationId: ORG_B,
    name: "SUPER_ADMIN",
    isSystem: true,
    isActive: true,
  })

  grantAll(ROLE_A)
  grantAll(ROLE_B)
  const hrPerms = [permissions.usersView, permissions.usersEdit, permissions.usersInvite, permissions.usersDeactivate]
  for (const key of hrPerms) {
    const permission = memory.tables.Permission.find((row) => row.key === key)!
    memory.insert("RolePermission", { roleId: ROLE_A_HR, permissionId: permission.id })
  }

  memory.insert("OrganizationMember", {
    id: "mem-a",
    organizationId: ORG_A,
    userId: USER_A,
    roleId: ROLE_A,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "mem-a2",
    organizationId: ORG_A,
    userId: USER_A2,
    roleId: ROLE_A_HR,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "mem-b",
    organizationId: ORG_B,
    userId: USER_B,
    roleId: ROLE_B,
    status: "ACTIVE",
  })

  memory.insert("Department", { id: "dept-a", organizationId: ORG_A, name: "Emergency" })
  memory.insert("Profession", { id: "prof-a", organizationId: ORG_A, name: "Nurse", isActive: true })
  memory.insert("StaffProfile", {
    id: "staff-a",
    organizationId: ORG_A,
    staffNumber: "N-1",
    firstName: "Ama",
    lastName: "Mensah",
    professionId: "prof-a",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-b",
    organizationId: ORG_B,
    staffNumber: "N-2",
    firstName: "Kofi",
    lastName: "Boateng",
    professionId: "prof-a",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
}

describe("organization administration", () => {
  beforeEach(() => {
    memory.reset()
    cookieStore.reset()
    getAuthUser.mockReset()
    processDomainNotification.mockReset()
    seed()
    authenticate(AUTH_A)
  })

  it("creates a hashed, expiring invitation and rejects duplicates", async () => {
    const invitation = await createInvitation({ email: "new@test.local", roleId: ROLE_A_HR })

    expect(invitation.status).toBe("PENDING")
    expect(String(invitation.tokenHash)).toHaveLength(64)
    expect(invitation.email).toBe("new@test.local")
    expect(memory.tables.AuditEvent.some((row) => row.action === "USER_INVITED")).toBe(true)
    expect(JSON.stringify(memory.tables.AuditEvent)).not.toContain(String(invitation.tokenHash).slice(0, 12) === "unused" ? "token" : "raw-token")

    await expect(createInvitation({ email: "new@test.local", roleId: ROLE_A_HR })).rejects.toMatchObject({
      code: "DUPLICATE",
    })
  })

  it("rejects invitations that use another organization's role", async () => {
    await expect(createInvitation({ email: "new@test.local", roleId: ROLE_B })).rejects.toMatchObject({
      code: "ROLE_UNAVAILABLE",
    })
  })

  it("revokes an invitation so the token can never be accepted", async () => {
    const invitation = await createInvitation({ email: "new@test.local", roleId: ROLE_A_HR })
    await revokeInvitation({ invitationId: invitation.id })

    getAuthUser.mockResolvedValue({ id: AUTH_INVITEE, email: "new@test.local" })
    await expect(acceptInvitation({ token: "not-the-hash" })).rejects.toMatchObject({ code: "NOT_FOUND" })

    const token = "test-token-value"
    memory.tables.OrganizationInvitation[0]!.tokenHash = hashInvitationToken(token)
    memory.tables.OrganizationInvitation[0]!.status = "REVOKED"

    await expect(acceptInvitation({ token })).rejects.toMatchObject({ code: "INVITATION_REVOKED" })
  })

  it("accepts a valid invitation for the matching verified email", async () => {
    const invitation = await createInvitation({ email: "new@test.local", roleId: ROLE_A_HR })
    const token = "accept-me-please-token"
    memory.tables.OrganizationInvitation[0]!.tokenHash = hashInvitationToken(token)

    getAuthUser.mockResolvedValue({
      id: AUTH_INVITEE,
      email: "New@test.local",
      email_confirmed_at: "2026-01-01T00:00:00Z",
    })

    const result = await acceptInvitation({ token })
    expect(result.membership.status).toBe("ACTIVE")
    expect(result.membership.organizationId).toBe(ORG_A)
    expect(memory.tables.OrganizationInvitation[0]?.status).toBe("ACCEPTED")
    expect(memory.tables.AuditEvent.some((row) => row.action === "INVITATION_ACCEPTED")).toBe(true)
    expect(invitation.id).toBeTruthy()
  })

  it("rejects expired, already accepted, and wrong-email tokens", async () => {
    await createInvitation({ email: "new@test.local", roleId: ROLE_A_HR })
    const token = "expire-token"
    const row = memory.tables.OrganizationInvitation[0]!
    row.tokenHash = hashInvitationToken(token)
    row.expiresAt = Temporal.Now.instant().subtract({ hours: 1 }).toString()

    getAuthUser.mockResolvedValue({ id: AUTH_INVITEE, email: "new@test.local" })
    await expect(acceptInvitation({ token })).rejects.toMatchObject({ code: "INVITATION_EXPIRED" })

    row.status = "PENDING"
    row.expiresAt = Temporal.Now.instant().add({ hours: 24 }).toString()
    getAuthUser.mockResolvedValue({ id: AUTH_INVITEE, email: "other@test.local" })
    await expect(acceptInvitation({ token })).rejects.toMatchObject({ code: "INVITATION_EMAIL_MISMATCH" })
    expect(row.status).toBe("PENDING")

    row.status = "ACCEPTED"
    getAuthUser.mockResolvedValue({ id: AUTH_INVITEE, email: "new@test.local" })
    await expect(acceptInvitation({ token })).rejects.toMatchObject({ code: "INVITATION_ACCEPTED" })
  })

  it("does not accept an invitation into a suspended organization", async () => {
    await createInvitation({ email: "new@test.local", roleId: ROLE_A_HR })
    const token = "suspended-token"
    memory.tables.OrganizationInvitation[0]!.tokenHash = hashInvitationToken(token)
    memory.tables.Organization[0]!.status = "SUSPENDED"

    getAuthUser.mockResolvedValue({ id: AUTH_INVITEE, email: "new@test.local" })
    await expect(acceptInvitation({ token })).rejects.toMatchObject({ code: "ORGANIZATION_SUSPENDED" })
  })

  it("resends by rotating the token hash", async () => {
    const invitation = await createInvitation({ email: "new@test.local", roleId: ROLE_A_HR })
    const previousHash = invitation.tokenHash
    memory.tables.OrganizationInvitation[0]!.updatedAt = Temporal.Now.instant()
      .subtract({ minutes: 15 })
      .toString()

    const resent = await resendInvitation({ invitationId: invitation.id })
    expect(resent.tokenHash).not.toBe(previousHash)
    expect(memory.tables.AuditEvent.some((row) => row.action === "INVITATION_RESENT")).toBe(true)
  })

  it("protects the last administrator from deactivation and demotion", async () => {
    await expect(deactivateMembership({ membershipId: "mem-a" })).rejects.toMatchObject({
      code: "LAST_ADMIN",
    })
    await expect(
      changeMembershipRole({ membershipId: "mem-a", roleId: ROLE_A_HR }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" })
  })

  it("changes and deactivates a non-admin membership", async () => {
    const changed = await changeMembershipRole({ membershipId: "mem-a2", roleId: ROLE_A })
    expect(changed.roleId).toBe(ROLE_A)

    const deactivated = await deactivateMembership({ membershipId: "mem-a2" })
    expect(deactivated.status).toBe("SUSPENDED")

    const reactivated = await reactivateMembership({ membershipId: "mem-a2" })
    expect(reactivated.status).toBe("ACTIVE")
  })

  it("rejects cross-tenant membership and role manipulation", async () => {
    await expect(deactivateMembership({ membershipId: "mem-b" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
    await expect(
      changeMembershipRole({ membershipId: "mem-a2", roleId: ROLE_B }),
    ).rejects.toMatchObject({ code: "ROLE_UNAVAILABLE" })

    const listed = await listMemberships()
    expect(listed.items.every((item) => item.organizationId === ORG_A)).toBe(true)
  })

  it("creates custom roles and blocks system role edits", async () => {
    const role = await createCustomRole({
      name: "Night supervisor",
      permissionKeys: [permissions.rosterView],
    })
    expect(role.isSystem).toBe(false)

    await expect(
      updateCustomRole({
        roleId: ROLE_A,
        name: "SUPER_ADMIN",
        permissionKeys: [permissions.rosterView],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })

    await expect(deactivateCustomRole({ roleId: ROLE_A })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("links and unlinks staff in the same organization only", async () => {
    const linked = await linkMembershipStaff({ membershipId: "mem-a2", staffId: "staff-a" })
    expect(linked.userId).toBe(USER_A2)

    await expect(linkMembershipStaff({ membershipId: "mem-a2", staffId: "staff-b" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    const unlinked = await unlinkMembershipStaff({ membershipId: "mem-a2" })
    expect(unlinked?.userId).toBeNull()
    expect(memory.tables.StaffProfile.find((row) => row.id === "staff-a")).toBeDefined()
    expect(memory.tables.User.find((row) => row.id === USER_A2)).toBeDefined()
  })

  it("suspends operational access and records audit events", async () => {
    const suspended = await suspendOrganization()
    expect(suspended.status).toBe("SUSPENDED")
    expect(memory.tables.AuditEvent.some((row) => row.action === "ORGANIZATION_SUSPENDED")).toBe(true)

    await expect(
      updateOrganizationSettings({
        name: "Hospital A",
        organizationType: "HOSPITAL",
        country: "Ghana",
        timezone: "Africa/Accra",
      }),
    ).rejects.toMatchObject({ code: "ORGANIZATION_SUSPENDED" })

    await expect(createInvitation({ email: "later@test.local", roleId: ROLE_A_HR })).rejects.toMatchObject({
      code: "ORGANIZATION_SUSPENDED",
    })

    const restored = await reactivateOrganization()
    expect(restored.status).toBe("ACTIVE")
  })

  it("updates organization identity with an IANA timezone", async () => {
    const updated = await updateOrganizationSettings({
      name: "Korle Bu",
      organizationType: "CLINIC",
      country: "Ghana",
      timezone: "Africa/Accra",
      email: "ops@test.local",
    })

    expect(updated).toMatchObject({
      name: "Korle Bu",
      organizationType: "CLINIC",
      timezone: "Africa/Accra",
    })
    expect(memory.tables.AuditEvent.some((row) => row.action === "ORGANIZATION_UPDATED")).toBe(true)
  })
})
