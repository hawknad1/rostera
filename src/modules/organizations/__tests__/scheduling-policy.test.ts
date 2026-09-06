import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { DEFAULT_ROLE_NAMES } from "@/modules/organizations/default-roles"
import { ensureDefaultSchedulingPolicy } from "@/modules/organizations/services/ensure-scheduling-policy"
import { provisionOrganization } from "@/modules/organizations/services/provision-organization"
import {
  getSchedulingPolicy,
  updateSchedulingPolicy,
} from "@/modules/organizations/services/scheduling-policy"
import { DISABLED_SCHEDULING_POLICY } from "@/modules/scheduling/types/scheduling-policy"
import { db } from "@/prisma/db"

const AUTH_USER_A = "supabase-auth-user-a"
const AUTH_USER_B = "supabase-auth-user-b"
const USER_A_ID = "user-a"
const USER_B_ID = "user-b"
const ORG_A_ID = "org-a"
const ORG_B_ID = "org-b"
const ROLE_A_ID = "role-a"
const ROLE_B_ID = "role-b"
const STAFF_ROLE_A_ID = "role-staff-a"

const PERMISSION_IDS = {
  settingsView: "perm-settings-view",
  settingsEdit: "perm-settings-edit",
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

function seedPermissions() {
  memory.insert("Permission", {
    id: PERMISSION_IDS.settingsView,
    key: permissions.settingsView,
  })
  memory.insert("Permission", {
    id: PERMISSION_IDS.settingsEdit,
    key: permissions.settingsEdit,
  })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
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
  memory.insert("Role", { id: STAFF_ROLE_A_ID, organizationId: ORG_A_ID, name: "STAFF" })
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

describe("scheduling policy persistence", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
  })

  it("creates a disabled default policy when an organization is provisioned", async () => {
    getAuthUser.mockResolvedValue({
      id: AUTH_USER_A,
      email: "admin@hospital.test",
      phone: null,
    })

    const result = await provisionOrganization({
      name: "Ridge Hospital",
      country: "Ghana",
      timezone: "Africa/Accra",
    })

    expect(memory.tables.OrganizationSchedulingPolicy).toHaveLength(1)
    expect(memory.tables.OrganizationSchedulingPolicy[0]).toMatchObject({
      organizationId: result.organization.id,
      ...DISABLED_SCHEDULING_POLICY,
    })
  })

  it("creates a default policy once and does not duplicate on repeated ensure", async () => {
    seedHospitals()

    const first = await ensureDefaultSchedulingPolicy(db.orm, ORG_A_ID)
    const second = await ensureDefaultSchedulingPolicy(db.orm, ORG_A_ID)

    expect(first.id).toBe(second.id)
    expect(
      memory.tables.OrganizationSchedulingPolicy.filter((row) => row.organizationId === ORG_A_ID),
    ).toHaveLength(1)
  })

  it("keeps policies tenant-scoped", async () => {
    seedHospitals()

    await ensureDefaultSchedulingPolicy(db.orm, ORG_A_ID)
    await ensureDefaultSchedulingPolicy(db.orm, ORG_B_ID)

    expect(memory.tables.OrganizationSchedulingPolicy).toHaveLength(2)
    expect(
      memory.tables.OrganizationSchedulingPolicy.map((row) => row.organizationId).sort(),
    ).toEqual([ORG_A_ID, ORG_B_ID])
  })

  it("lets an authorized administrator update the current organization policy", async () => {
    seedPermissions()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.settingsView)
    grant(ROLE_A_ID, PERMISSION_IDS.settingsEdit)
    authenticateAsA()

    const updated = await updateSchedulingPolicy({
      ...DISABLED_SCHEDULING_POLICY,
      minimumRestMinutes: 660,
      maximumWeekendShifts: 2,
    })

    expect(updated).toMatchObject({
      organizationId: ORG_A_ID,
      minimumRestMinutes: 660,
      maximumWeekendShifts: 2,
      maximumWeeklyMinutes: null,
    })

    const loaded = await getSchedulingPolicy()
    expect(loaded).toMatchObject({
      organizationId: ORG_A_ID,
      minimumRestMinutes: 660,
      maximumWeekendShifts: 2,
    })
    expect(
      memory.tables.OrganizationSchedulingPolicy.filter((row) => row.organizationId === ORG_B_ID),
    ).toHaveLength(0)
  })

  it("does not let a user update another organization's policy", async () => {
    seedPermissions()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.settingsView)
    grant(ROLE_A_ID, PERMISSION_IDS.settingsEdit)
    grant(ROLE_B_ID, PERMISSION_IDS.settingsView)
    grant(ROLE_B_ID, PERMISSION_IDS.settingsEdit)
    await ensureDefaultSchedulingPolicy(db.orm, ORG_B_ID)
    authenticateAsA()

    await updateSchedulingPolicy({
      ...DISABLED_SCHEDULING_POLICY,
      maximumConsecutiveDays: 5,
    })

    expect(memory.tables.OrganizationSchedulingPolicy.find((row) => row.organizationId === ORG_A_ID))
      .toMatchObject({ maximumConsecutiveDays: 5 })
    expect(memory.tables.OrganizationSchedulingPolicy.find((row) => row.organizationId === ORG_B_ID))
      .toMatchObject({ maximumConsecutiveDays: null })
  })

  it("rejects an unauthorized policy update", async () => {
    seedPermissions()
    seedHospitals()
    memory.tables.OrganizationMember[0]!.roleId = STAFF_ROLE_A_ID
    authenticateAsA()

    await expect(
      updateSchedulingPolicy({
        ...DISABLED_SCHEDULING_POLICY,
        minimumRestMinutes: 660,
      }),
    ).rejects.toMatchObject({
      name: "SchedulingPolicyError",
      code: "FORBIDDEN",
    })
  })

  it("rejects invalid policy values", async () => {
    seedPermissions()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.settingsView)
    grant(ROLE_A_ID, PERMISSION_IDS.settingsEdit)
    authenticateAsA()

    await expect(
      updateSchedulingPolicy({
        ...DISABLED_SCHEDULING_POLICY,
        minimumRestMinutes: -11,
      }),
    ).rejects.toMatchObject({
      name: "SchedulingPolicyError",
      code: "INVALID_SCHEDULING_POLICY",
    })
  })
})

describe("provisioning rollback still excludes scheduling policy", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    getAuthUser.mockResolvedValue({
      id: AUTH_USER_A,
      email: "admin@hospital.test",
      phone: null,
    })
  })

  it("does not leave a policy row when provisioning fails before completion", async () => {
    memory.failNextCreate("OrganizationMember")

    await expect(
      provisionOrganization({
        name: "Ridge Hospital",
        country: "Ghana",
        timezone: "Africa/Accra",
      }),
    ).rejects.toMatchObject({
      code: "PROVISIONING_FAILED",
    })

    expect(memory.tables.OrganizationSchedulingPolicy).toHaveLength(0)
    expect(memory.tables.Role).toHaveLength(0)
  })

  it("does not create extra default roles while creating the policy", async () => {
    const result = await provisionOrganization({
      name: "Ridge Hospital",
      country: "Ghana",
      timezone: "Africa/Accra",
    })

    expect(memory.tables.Role).toHaveLength(DEFAULT_ROLE_NAMES.length)
    expect(memory.tables.OrganizationSchedulingPolicy).toHaveLength(1)
    expect(memory.tables.OrganizationSchedulingPolicy[0]?.organizationId).toBe(
      result.organization.id,
    )
  })
})
