import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { ensureDefaultRoleGrants } from "@/modules/organizations/ensure-permissions"
import { AUDIT_PAGE_SIZE } from "@/modules/audit/types/audit"
import { AuditError } from "@/modules/audit/errors"
import { getAuditEvent, listAuditEvents } from "@/modules/audit/services/audit"
import { recordAuditEvent } from "@/modules/audit/services/record"
import { db } from "@/prisma/db"

const AUTH_ADMIN = "auth-admin"
const AUTH_HR = "auth-hr"
const AUTH_MANAGER = "auth-manager"
const AUTH_STAFF = "auth-staff"
const AUTH_SUPERVISOR = "auth-supervisor"
const AUTH_HEAD = "auth-head"
const AUTH_B = "auth-b"

const USER_ADMIN = "user-admin"
const USER_HR = "user-hr"
const USER_MANAGER = "user-manager"
const USER_STAFF = "user-staff"
const USER_SUPERVISOR = "user-supervisor"
const USER_HEAD = "user-head"
const USER_B = "user-b"

const ORG_A = "org-a"
const ORG_B = "org-b"

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

function authenticate(authProviderId: string) {
  getAuthUser.mockResolvedValue({ id: authProviderId })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

async function seedEvent(input: {
  organizationId: string
  userId: string
  action?: "ROSTER_CREATED" | "LEAVE_APPROVED" | "STAFF_CREATED"
  entityId: string
  createdAt: string
  summary?: string
}) {
  const row = await db.transaction(async (tx) =>
    recordAuditEvent(tx, {
      actor: {
        type: "USER",
        userId: input.userId,
        organizationId: input.organizationId,
      },
      action: input.action ?? "ROSTER_CREATED",
      entityType: input.action === "LEAVE_APPROVED" ? "LEAVE_REQUEST" : "ROSTER",
      entityId: input.entityId,
      summary: input.summary ?? `Event ${input.entityId}`,
      eventId: `${input.action ?? "ROSTER_CREATED"}:${input.entityId}`,
    }),
  )
  const stored = memory.tables.AuditEvent.find((event) => event.id === row.id)
  if (stored) {
    stored.createdAt = input.createdAt
  }
  return row
}


function seed() {
  memory.insert("Permission", { id: "perm-audit-view", key: permissions.auditView })

  memory.insert("Organization", {
    id: ORG_A,
    name: "Hospital A",
    slug: "hospital-a",
    timezone: "Africa/Accra",
  })
  memory.insert("Organization", {
    id: ORG_B,
    name: "Hospital B",
    slug: "hospital-b",
    timezone: "Africa/Accra",
  })

  memory.insert("User", { id: USER_ADMIN, authProviderId: AUTH_ADMIN, email: "admin@test.local" })
  memory.insert("User", { id: USER_HR, authProviderId: AUTH_HR, email: "hr@test.local" })
  memory.insert("User", { id: USER_MANAGER, authProviderId: AUTH_MANAGER, email: "rm@test.local" })
  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "staff@test.local" })
  memory.insert("User", {
    id: USER_SUPERVISOR,
    authProviderId: AUTH_SUPERVISOR,
    email: "sup@test.local",
  })
  memory.insert("User", { id: USER_HEAD, authProviderId: AUTH_HEAD, email: "head@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })

  memory.insert("Role", { id: "role-admin", organizationId: ORG_A, name: "SUPER_ADMIN" })
  memory.insert("Role", { id: "role-hr", organizationId: ORG_A, name: "HR" })
  memory.insert("Role", { id: "role-manager", organizationId: ORG_A, name: "ROSTER_MANAGER" })
  memory.insert("Role", { id: "role-staff", organizationId: ORG_A, name: "STAFF" })
  memory.insert("Role", { id: "role-supervisor", organizationId: ORG_A, name: "SUPERVISOR" })
  memory.insert("Role", { id: "role-head", organizationId: ORG_A, name: "DEPARTMENT_HEAD" })
  memory.insert("Role", { id: "role-b", organizationId: ORG_B, name: "HR" })

  grant("role-admin", "perm-audit-view")
  grant("role-hr", "perm-audit-view")
  grant("role-manager", "perm-audit-view")
  grant("role-b", "perm-audit-view")

  memory.insert("OrganizationMember", {
    id: "membership-admin",
    organizationId: ORG_A,
    userId: USER_ADMIN,
    roleId: "role-admin",
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
    id: "membership-head",
    organizationId: ORG_A,
    userId: USER_HEAD,
    roleId: "role-head",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-b",
    organizationId: ORG_B,
    userId: USER_B,
    roleId: "role-b",
    status: "ACTIVE",
  })
}

describe("audit authorization and pagination", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seed()
  })

  it("rejects unauthenticated viewers", async () => {
    getAuthUser.mockResolvedValue(null)
    await expect(listAuditEvents()).rejects.toMatchObject({
      name: "AuditError",
      code: "UNAUTHENTICATED",
    })
  })

  it("does not let STAFF view audit", async () => {
    authenticate(AUTH_STAFF)
    await expect(listAuditEvents()).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("does not let SUPERVISOR view audit", async () => {
    authenticate(AUTH_SUPERVISOR)
    await expect(listAuditEvents()).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("does not let DEPARTMENT_HEAD view organization-wide audit", async () => {
    authenticate(AUTH_HEAD)
    await expect(listAuditEvents()).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("backfills audit.view for HR and roster managers without removing extra grants", async () => {
    memory.tables.RolePermission.length = 0
    memory.insert("Permission", { id: "perm-extra", key: permissions.staffView })
    memory.insert("RolePermission", { roleId: "role-hr", permissionId: "perm-extra" })

    await ensureDefaultRoleGrants(db.orm, ORG_A)

    authenticate(AUTH_HR)
    await expect(listAuditEvents()).resolves.toMatchObject({ total: 0 })
    authenticate(AUTH_MANAGER)
    await expect(listAuditEvents()).resolves.toMatchObject({ total: 0 })
    expect(
      memory.tables.RolePermission.some(
        (row) => row.roleId === "role-hr" && row.permissionId === "perm-extra",
      ),
    ).toBe(true)
  })

  it("lets HR, roster managers, and super admins view audit", async () => {
    await seedEvent({
      organizationId: ORG_A,
      userId: USER_HR,
      entityId: "roster-1",
      createdAt: "2026-09-06T10:00:00.000Z",
    })

    authenticate(AUTH_HR)
    await expect(listAuditEvents()).resolves.toMatchObject({ total: 1 })

    authenticate(AUTH_MANAGER)
    await expect(listAuditEvents()).resolves.toMatchObject({ total: 1 })

    authenticate(AUTH_ADMIN)
    await expect(listAuditEvents()).resolves.toMatchObject({ total: 1 })
  })

  it("does not let organization A see organization B audit records", async () => {
    const orgA = await seedEvent({
      organizationId: ORG_A,
      userId: USER_HR,
      entityId: "roster-a",
      createdAt: "2026-09-06T10:00:00.000Z",
    })
    const orgB = await seedEvent({
      organizationId: ORG_B,
      userId: USER_B,
      entityId: "roster-b",
      createdAt: "2026-09-06T11:00:00.000Z",
    })

    authenticate(AUTH_HR)
    const listed = await listAuditEvents()
    expect(listed.items.map((item) => item.id)).toEqual([orgA.id])

    await expect(getAuditEvent(String(orgB.id))).rejects.toBeInstanceOf(AuditError)
    await expect(getAuditEvent(String(orgB.id))).rejects.toMatchObject({ code: "AUDIT_NOT_FOUND" })
  })

  it("paginates tenant-scoped results in pages of 25", async () => {
    for (let index = 0; index < 30; index += 1) {
      await seedEvent({
        organizationId: ORG_A,
        userId: USER_HR,
        entityId: `roster-${index}`,
        createdAt: `2026-09-01T00:${String(index).padStart(2, "0")}:00.000Z`,
        summary: `Created roster ${index}`,
      })
    }

    authenticate(AUTH_B)
    await seedEvent({
      organizationId: ORG_B,
      userId: USER_B,
      entityId: "other",
      createdAt: "2026-09-06T12:00:00.000Z",
    })

    authenticate(AUTH_HR)
    const page1 = await listAuditEvents({ page: 1 })
    const page2 = await listAuditEvents({ page: 2 })

    expect(page1.pageSize).toBe(AUDIT_PAGE_SIZE)
    expect(page1.items).toHaveLength(25)
    expect(page1.total).toBe(30)
    expect(page1.hasNext).toBe(true)
    expect(page1.hasPrevious).toBe(false)
    expect(page2.items).toHaveLength(5)
    expect(page2.hasNext).toBe(false)
    expect(page2.hasPrevious).toBe(true)
    expect(page1.items[0]?.entityId).toBe("roster-29")
  })

  it("filters by action and search without leaking other tenants", async () => {
    await seedEvent({
      organizationId: ORG_A,
      userId: USER_HR,
      action: "LEAVE_APPROVED",
      entityId: "leave-1",
      createdAt: "2026-09-06T10:00:00.000Z",
      summary: "Approved annual leave for staff member.",
    })
    await seedEvent({
      organizationId: ORG_A,
      userId: USER_HR,
      entityId: "roster-keep",
      createdAt: "2026-09-06T11:00:00.000Z",
      summary: "Created roster Keep.",
    })
    await seedEvent({
      organizationId: ORG_B,
      userId: USER_B,
      action: "LEAVE_APPROVED",
      entityId: "leave-b",
      createdAt: "2026-09-06T12:00:00.000Z",
      summary: "Approved annual leave for staff member.",
    })

    authenticate(AUTH_HR)
    const byAction = await listAuditEvents({ action: "LEAVE_APPROVED" })
    expect(byAction.items).toHaveLength(1)
    expect(byAction.items[0]?.entityId).toBe("leave-1")

    const bySearch = await listAuditEvents({ q: "leave-1" })
    expect(bySearch.items).toHaveLength(1)
    expect(bySearch.items[0]?.entityId).toBe("leave-1")
  })
})
