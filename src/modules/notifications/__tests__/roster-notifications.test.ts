import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createAssignment } from "@/modules/rosters/services/assignments"
import {
  publishRoster,
  returnRosterToDraft,
  submitRosterForReview,
} from "@/modules/rosters/services/lifecycle"
import { createRoster } from "@/modules/rosters/services/rosters"
import { getRoster } from "@/modules/rosters/services/rosters"
import { notificationHref } from "@/modules/notifications/deep-links"

const AUTH_MANAGER = "supabase-auth-manager"
const AUTH_REVIEWER = "supabase-auth-reviewer"
const AUTH_STAFF = "supabase-auth-staff"
const AUTH_B = "supabase-auth-org-b"

const USER_MANAGER = "user-manager"
const USER_REVIEWER = "user-reviewer"
const USER_STAFF = "user-staff"
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

function grantManager(roleId: string) {
  grant(roleId, "perm-roster-view")
  grant(roleId, "perm-roster-create")
  grant(roleId, "perm-roster-edit")
  grant(roleId, "perm-roster-review")
  grant(roleId, "perm-roster-publish")
}

function seed() {
  memory.insert("Permission", { id: "perm-roster-view", key: permissions.rosterView })
  memory.insert("Permission", { id: "perm-roster-create", key: permissions.rosterCreate })
  memory.insert("Permission", { id: "perm-roster-edit", key: permissions.rosterEdit })
  memory.insert("Permission", { id: "perm-roster-review", key: permissions.rosterReview })
  memory.insert("Permission", { id: "perm-roster-publish", key: permissions.rosterPublish })

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

  memory.insert("User", { id: USER_MANAGER, authProviderId: AUTH_MANAGER, email: "mgr@test.local" })
  memory.insert("User", {
    id: USER_REVIEWER,
    authProviderId: AUTH_REVIEWER,
    email: "rev@test.local",
  })
  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "ama@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })

  memory.insert("Role", { id: "role-manager", organizationId: ORG_A, name: "ROSTER_MANAGER" })
  memory.insert("Role", { id: "role-staff", organizationId: ORG_A, name: "STAFF" })
  memory.insert("Role", { id: "role-b", organizationId: ORG_B, name: "ROSTER_MANAGER" })

  grantManager("role-manager")
  grant("role-staff", "perm-roster-view")
  grantManager("role-b")

  memory.insert("OrganizationMember", {
    id: "membership-manager",
    organizationId: ORG_A,
    userId: USER_MANAGER,
    roleId: "role-manager",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-reviewer",
    organizationId: ORG_A,
    userId: USER_REVIEWER,
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
    id: "membership-b",
    organizationId: ORG_B,
    userId: USER_B,
    roleId: "role-b",
    status: "ACTIVE",
  })

  memory.insert("Profession", {
    id: "prof-nurse",
    organizationId: null,
    name: "Nurse",
    isActive: true,
  })
  memory.insert("Department", { id: "dept-a", organizationId: ORG_A, name: "Emergency" })
  memory.insert("Department", { id: "dept-b", organizationId: ORG_B, name: "Emergency" })
  memory.insert("StaffProfile", {
    id: "staff-ama",
    organizationId: ORG_A,
    userId: USER_STAFF,
    staffNumber: "NUR-001",
    firstName: "Ama",
    lastName: "Mensah",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-unlinked",
    organizationId: ORG_A,
    staffNumber: "NUR-002",
    firstName: "Efua",
    lastName: "Boateng",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("ShiftType", {
    id: "shift-day",
    organizationId: ORG_A,
    name: "Day",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })
}

beforeEach(() => {
  memory.reset()
  seed()
})

async function createPublishedReadyRoster() {
  authenticate(AUTH_MANAGER)
  const roster = await createRoster({
    name: "3 September — Emergency",
    departmentId: "dept-a",
    startDate: "2026-09-03",
    endDate: "2026-09-03",
  })
  await createAssignment({
    rosterId: roster.id,
    date: "2026-09-03",
    shiftTypeId: "shift-day",
    staffId: "staff-ama",
  })
  return roster
}

describe("roster notifications", () => {
  it("notifies other roster managers when a roster is submitted", async () => {
    const roster = await createPublishedReadyRoster()
    await submitRosterForReview(roster.id)

    const submitted = memory.tables.Notification.filter(
      (row) => row.type === "ROSTER_SUBMITTED_FOR_REVIEW",
    )
    expect(submitted.map((row) => row.recipientUserId)).toEqual([USER_REVIEWER])
    expect(submitted[0]?.entityId).toBe(roster.id)
    expect(notificationHref("ROSTER", String(roster.id))).toBe(`/rosters/${roster.id}`)
  })

  it("notifies the roster creator when it is returned to draft", async () => {
    const roster = await createPublishedReadyRoster()
    await submitRosterForReview(roster.id)
    authenticate(AUTH_REVIEWER)
    await returnRosterToDraft(roster.id)

    expect(
      memory.tables.Notification.filter((row) => row.type === "ROSTER_RETURNED_TO_DRAFT").map(
        (row) => row.recipientUserId,
      ),
    ).toEqual([USER_MANAGER])
  })

  it("notifies assigned linked staff when a roster is published", async () => {
    const roster = await createPublishedReadyRoster()
    await submitRosterForReview(roster.id)
    await publishRoster(roster.id)

    const published = memory.tables.Notification.filter((row) => row.type === "ROSTER_PUBLISHED")
    expect(published.map((row) => row.recipientUserId)).toEqual([USER_STAFF])
  })

  it("does not notify unlinked assigned staff", async () => {
    authenticate(AUTH_MANAGER)
    const roster = await createRoster({
      name: "3 September — Emergency",
      departmentId: "dept-a",
      startDate: "2026-09-03",
      endDate: "2026-09-03",
    })
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-unlinked",
    })
    await submitRosterForReview(roster.id)
    await publishRoster(roster.id)

    expect(
      memory.tables.Notification.filter((row) => row.type === "ROSTER_PUBLISHED"),
    ).toHaveLength(0)
  })

  it("does not leak roster access across organizations via a notification id", async () => {
    const roster = await createPublishedReadyRoster()
    authenticate(AUTH_B)
    await expect(getRoster(roster.id)).rejects.toMatchObject({
      code: "ROSTER_NOT_FOUND",
    })
  })
})
