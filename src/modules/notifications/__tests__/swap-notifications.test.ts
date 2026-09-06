import { Temporal } from "temporal-polyfill"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { assignmentDateTimeWindow } from "@/lib/dates/assignment-window"
import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { approveSwap } from "@/modules/shift-swaps/services/approve-swap"
import { cancelSwap } from "@/modules/shift-swaps/services/cancel-swap"
import { createSwap } from "@/modules/shift-swaps/services/create-swap"
import { rejectSwap } from "@/modules/shift-swaps/services/reject-swap"
import { notificationHref } from "@/modules/notifications/deep-links"

const AUTH_HEAD = "supabase-auth-head"
const AUTH_STAFF = "supabase-auth-staff"
const AUTH_STAFF_B = "supabase-auth-staff-b"

const USER_HEAD = "user-head"
const USER_STAFF = "user-staff"
const USER_STAFF_B = "user-staff-b"
const ORG_A = "org-a"
const TIME_ZONE = "Africa/Accra"

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

function insertAssignment(input: { id: string; staffId: string; date: string }) {
  const window = assignmentDateTimeWindow({
    date: input.date,
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    timeZone: TIME_ZONE,
  })

  memory.insert("ShiftAssignment", {
    id: input.id,
    organizationId: ORG_A,
    rosterId: "roster-a",
    departmentId: "dept-a",
    staffId: input.staffId,
    shiftTypeId: "shift-day",
    professionId: "prof-nurse",
    date: input.date,
    shiftStartTime: "08:00",
    shiftEndTime: "16:00",
    isOvernight: false,
    startDateTime: window.start,
    endDateTime: window.end,
    createdAt: Temporal.Now.instant(),
  })
}

function seed() {
  memory.insert("Permission", { id: "perm-swap-view", key: permissions.shiftSwapView })
  memory.insert("Permission", { id: "perm-swap-request", key: permissions.shiftSwapRequest })
  memory.insert("Permission", { id: "perm-swap-approve", key: permissions.shiftSwapApprove })
  memory.insert("Permission", { id: "perm-swap-reject", key: permissions.shiftSwapReject })

  memory.insert("Organization", {
    id: ORG_A,
    name: "Hospital A",
    slug: "hospital-a",
    timezone: TIME_ZONE,
  })
  memory.insert("User", { id: USER_HEAD, authProviderId: AUTH_HEAD, email: "head@test.local" })
  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "ama@test.local" })
  memory.insert("User", { id: USER_STAFF_B, authProviderId: AUTH_STAFF_B, email: "kofi@test.local" })

  memory.insert("Role", { id: "role-head", organizationId: ORG_A, name: "DEPARTMENT_HEAD" })
  memory.insert("Role", { id: "role-staff", organizationId: ORG_A, name: "STAFF" })

  grant("role-head", "perm-swap-view")
  grant("role-head", "perm-swap-approve")
  grant("role-head", "perm-swap-reject")
  grant("role-staff", "perm-swap-view")
  grant("role-staff", "perm-swap-request")

  memory.insert("OrganizationMember", {
    id: "membership-head",
    organizationId: ORG_A,
    userId: USER_HEAD,
    roleId: "role-head",
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
    id: "membership-staff-b",
    organizationId: ORG_A,
    userId: USER_STAFF_B,
    roleId: "role-staff",
    status: "ACTIVE",
  })

  memory.insert("Profession", {
    id: "prof-nurse",
    organizationId: null,
    name: "Nurse",
    isActive: true,
  })
  memory.insert("Department", { id: "dept-a", organizationId: ORG_A, name: "Emergency" })
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
    id: "staff-kofi",
    organizationId: ORG_A,
    userId: USER_STAFF_B,
    staffNumber: "NUR-002",
    firstName: "Kofi",
    lastName: "Owusu",
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
  memory.insert("Roster", {
    id: "roster-a",
    organizationId: ORG_A,
    departmentId: "dept-a",
    name: "September Week 1",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    status: "DRAFT",
    createdByUserId: USER_HEAD,
  })
  insertAssignment({ id: "assign-ama-10", staffId: "staff-ama", date: "2026-09-10" })
  insertAssignment({ id: "assign-kofi-12", staffId: "staff-kofi", date: "2026-09-12" })
}

beforeEach(() => {
  memory.reset()
  seed()
})

describe("shift swap notifications", () => {
  it("notifies the target staff when a swap is requested", async () => {
    authenticate(AUTH_STAFF)
    const swap = await createSwap({
      sourceAssignmentId: "assign-ama-10",
      targetAssignmentId: "assign-kofi-12",
    })

    const requested = memory.tables.Notification.filter(
      (row) => row.type === "SHIFT_SWAP_REQUESTED",
    )
    expect(requested.map((row) => row.recipientUserId)).toEqual([USER_STAFF_B])
    expect(requested[0]?.entityId).toBe(swap.id)
    expect(notificationHref("SHIFT_SWAP", String(swap.id))).toBe(`/shift-swaps/${swap.id}`)
  })

  it("notifies both linked staff when a swap is completed", async () => {
    authenticate(AUTH_STAFF)
    const swap = await createSwap({
      sourceAssignmentId: "assign-ama-10",
      targetAssignmentId: "assign-kofi-12",
    })
    authenticate(AUTH_HEAD)
    await approveSwap(String(swap.id))

    const completed = memory.tables.Notification.filter(
      (row) => row.type === "SHIFT_SWAP_COMPLETED",
    )
    expect(completed.map((row) => row.recipientUserId).sort()).toEqual(
      [USER_STAFF, USER_STAFF_B].sort(),
    )
  })

  it("notifies the requester when a swap is rejected", async () => {
    authenticate(AUTH_STAFF)
    const swap = await createSwap({
      sourceAssignmentId: "assign-ama-10",
      targetAssignmentId: "assign-kofi-12",
    })
    authenticate(AUTH_HEAD)
    await rejectSwap({ id: String(swap.id) })

    expect(
      memory.tables.Notification.filter((row) => row.type === "SHIFT_SWAP_REJECTED").map(
        (row) => row.recipientUserId,
      ),
    ).toEqual([USER_STAFF])
  })

  it("notifies the target when a pending swap is cancelled", async () => {
    authenticate(AUTH_STAFF)
    const swap = await createSwap({
      sourceAssignmentId: "assign-ama-10",
      targetAssignmentId: "assign-kofi-12",
    })
    await cancelSwap(String(swap.id))

    expect(
      memory.tables.Notification.filter((row) => row.type === "SHIFT_SWAP_CANCELLED").map(
        (row) => row.recipientUserId,
      ),
    ).toEqual([USER_STAFF_B])
  })

  it("does not create a completed notification when approval fails", async () => {
    insertAssignment({ id: "assign-kofi-same-slot", staffId: "staff-kofi", date: "2026-09-10" })
    authenticate(AUTH_STAFF)
    const swap = await createSwap({
      sourceAssignmentId: "assign-ama-10",
      targetAssignmentId: "assign-kofi-same-slot",
    })
    authenticate(AUTH_HEAD)
    await expect(approveSwap(String(swap.id))).rejects.toMatchObject({
      code: "SWAP_SCHEDULING_CONFLICT",
    })

    expect(
      memory.tables.Notification.filter((row) => row.type === "SHIFT_SWAP_COMPLETED"),
    ).toHaveLength(0)
    expect(memory.tables.ShiftSwapRequest.find((row) => row.id === swap.id)?.status).toBe(
      "PENDING",
    )
  })
})
