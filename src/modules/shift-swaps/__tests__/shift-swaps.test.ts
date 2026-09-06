import { Temporal } from "temporal-polyfill"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { assignmentDateTimeWindow } from "@/lib/dates/assignment-window"
import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { approveSwap } from "@/modules/shift-swaps/services/approve-swap"
import { cancelSwap } from "@/modules/shift-swaps/services/cancel-swap"
import { createSwap } from "@/modules/shift-swaps/services/create-swap"
import { rejectSwap } from "@/modules/shift-swaps/services/reject-swap"
import { getSwap, listSwaps } from "@/modules/shift-swaps/services/swaps"

const AUTH_HEAD = "supabase-auth-head"
const AUTH_STAFF = "supabase-auth-staff"
const AUTH_STAFF_B = "supabase-auth-staff-b"
const AUTH_VIEWER = "supabase-auth-viewer"
const AUTH_B = "supabase-auth-org-b"

const USER_HEAD = "user-head"
const USER_STAFF = "user-staff"
const USER_STAFF_B = "user-staff-b"
const USER_VIEWER = "user-viewer"
const USER_B = "user-b"

const ORG_A = "org-a"
const ORG_B = "org-b"

const ROLE_HEAD = "role-head"
const ROLE_STAFF = "role-staff"
const ROLE_VIEWER = "role-viewer"
const ROLE_B = "role-b"

const PERMISSION_IDS = {
  view: "perm-swap-view",
  request: "perm-swap-request",
  approve: "perm-swap-approve",
  reject: "perm-swap-reject",
} as const

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

function insertAssignment(input: {
  id: string
  staffId: string
  date: string
  shiftTypeId?: string
  rosterId?: string
  departmentId?: string
  professionId?: string
  startTime?: string
  endTime?: string
  isOvernight?: boolean
  organizationId?: string
}) {
  const startTime = input.startTime ?? "08:00"
  const endTime = input.endTime ?? "16:00"
  const isOvernight = input.isOvernight ?? false
  const window = assignmentDateTimeWindow({
    date: input.date,
    startTime,
    endTime,
    isOvernight,
    timeZone: TIME_ZONE,
  })

  memory.insert("ShiftAssignment", {
    id: input.id,
    organizationId: input.organizationId ?? ORG_A,
    rosterId: input.rosterId ?? "roster-a",
    departmentId: input.departmentId ?? "dept-a",
    staffId: input.staffId,
    shiftTypeId: input.shiftTypeId ?? "shift-day",
    professionId: input.professionId ?? "prof-nurse",
    date: input.date,
    shiftStartTime: startTime,
    shiftEndTime: endTime,
    isOvernight,
    startDateTime: window.start,
    endDateTime: window.end,
    createdAt: Temporal.Now.instant(),
  })
}

function seed() {
  memory.insert("Permission", { id: PERMISSION_IDS.view, key: permissions.shiftSwapView })
  memory.insert("Permission", { id: PERMISSION_IDS.request, key: permissions.shiftSwapRequest })
  memory.insert("Permission", { id: PERMISSION_IDS.approve, key: permissions.shiftSwapApprove })
  memory.insert("Permission", { id: PERMISSION_IDS.reject, key: permissions.shiftSwapReject })

  memory.insert("Organization", {
    id: ORG_A,
    name: "Hospital A",
    slug: "hospital-a",
    timezone: TIME_ZONE,
  })
  memory.insert("Organization", {
    id: ORG_B,
    name: "Hospital B",
    slug: "hospital-b",
    timezone: TIME_ZONE,
  })

  memory.insert("User", { id: USER_HEAD, authProviderId: AUTH_HEAD, email: "head@test.local" })
  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "ama@test.local" })
  memory.insert("User", { id: USER_STAFF_B, authProviderId: AUTH_STAFF_B, email: "kofi@test.local" })
  memory.insert("User", { id: USER_VIEWER, authProviderId: AUTH_VIEWER, email: "view@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })

  memory.insert("Role", { id: ROLE_HEAD, organizationId: ORG_A, name: "DEPARTMENT_HEAD" })
  memory.insert("Role", { id: ROLE_STAFF, organizationId: ORG_A, name: "STAFF" })
  memory.insert("Role", { id: ROLE_VIEWER, organizationId: ORG_A, name: "SUPERVISOR" })
  memory.insert("Role", { id: ROLE_B, organizationId: ORG_B, name: "DEPARTMENT_HEAD" })

  grant(ROLE_HEAD, PERMISSION_IDS.view)
  grant(ROLE_HEAD, PERMISSION_IDS.approve)
  grant(ROLE_HEAD, PERMISSION_IDS.reject)
  grant(ROLE_STAFF, PERMISSION_IDS.view)
  grant(ROLE_STAFF, PERMISSION_IDS.request)
  grant(ROLE_VIEWER, PERMISSION_IDS.view)
  grant(ROLE_B, PERMISSION_IDS.view)
  grant(ROLE_B, PERMISSION_IDS.approve)
  grant(ROLE_B, PERMISSION_IDS.reject)

  memory.insert("OrganizationMember", {
    id: "membership-head",
    organizationId: ORG_A,
    userId: USER_HEAD,
    roleId: ROLE_HEAD,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-staff",
    organizationId: ORG_A,
    userId: USER_STAFF,
    roleId: ROLE_STAFF,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-staff-b",
    organizationId: ORG_A,
    userId: USER_STAFF_B,
    roleId: ROLE_STAFF,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-viewer",
    organizationId: ORG_A,
    userId: USER_VIEWER,
    roleId: ROLE_VIEWER,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-b",
    organizationId: ORG_B,
    userId: USER_B,
    roleId: ROLE_B,
    status: "ACTIVE",
  })

  memory.insert("Profession", {
    id: "prof-nurse",
    organizationId: null,
    name: "Nurse",
    isActive: true,
  })
  memory.insert("Profession", {
    id: "prof-pharmacist",
    organizationId: null,
    name: "Pharmacist",
    isActive: true,
  })
  memory.insert("Department", { id: "dept-a", organizationId: ORG_A, name: "Emergency" })
  memory.insert("Department", { id: "dept-icu", organizationId: ORG_A, name: "ICU" })
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
  memory.insert("StaffProfile", {
    id: "staff-pharmacist",
    organizationId: ORG_A,
    staffNumber: "PHM-001",
    firstName: "Abena",
    lastName: "Boateng",
    professionId: "prof-pharmacist",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-icu",
    organizationId: ORG_A,
    staffNumber: "NUR-003",
    firstName: "Kojo",
    lastName: "Mensah",
    professionId: "prof-nurse",
    departmentId: "dept-icu",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-inactive",
    organizationId: ORG_A,
    staffNumber: "NUR-004",
    firstName: "Yaw",
    lastName: "Asante",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "TERMINATED",
  })
  memory.insert("StaffProfile", {
    id: "staff-b",
    organizationId: ORG_B,
    staffNumber: "NUR-001",
    firstName: "Efua",
    lastName: "Sarpong",
    professionId: "prof-nurse",
    departmentId: "dept-b",
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
  memory.insert("ShiftType", {
    id: "shift-night",
    organizationId: ORG_A,
    name: "Night",
    startTime: "22:00",
    endTime: "06:00",
    isOvernight: true,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-late",
    organizationId: ORG_A,
    name: "Late",
    startTime: "14:00",
    endTime: "22:00",
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
  memory.insert("Roster", {
    id: "roster-a2",
    organizationId: ORG_A,
    departmentId: "dept-a",
    name: "September Week 2",
    startDate: "2026-09-14",
    endDate: "2026-09-20",
    status: "DRAFT",
    createdByUserId: USER_HEAD,
  })
  memory.insert("Roster", {
    id: "roster-icu",
    organizationId: ORG_A,
    departmentId: "dept-icu",
    name: "ICU Week 1",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    status: "DRAFT",
    createdByUserId: USER_HEAD,
  })
  memory.insert("Roster", {
    id: "roster-b",
    organizationId: ORG_B,
    departmentId: "dept-b",
    name: "Hospital B Week 1",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    status: "DRAFT",
    createdByUserId: USER_B,
  })

  insertAssignment({ id: "assign-ama-10", staffId: "staff-ama", date: "2026-09-10" })
  insertAssignment({ id: "assign-kofi-12", staffId: "staff-kofi", date: "2026-09-12" })
}

function setPolicy(values: {
  minimumRestMinutes?: number | null
  maximumWeeklyMinutes?: number | null
  maximumConsecutiveDays?: number | null
  maximumNightShiftsPerWeek?: number | null
  maximumWeekendShifts?: number | null
}) {
  const existing = memory.tables.OrganizationSchedulingPolicy.find(
    (row) => row.organizationId === ORG_A,
  )
  const payload = {
    organizationId: ORG_A,
    minimumRestMinutes: values.minimumRestMinutes ?? null,
    maximumWeeklyMinutes: values.maximumWeeklyMinutes ?? null,
    maximumConsecutiveDays: values.maximumConsecutiveDays ?? null,
    maximumNightShiftsPerWeek: values.maximumNightShiftsPerWeek ?? null,
    maximumWeekendShifts: values.maximumWeekendShifts ?? null,
  }

  if (existing) {
    Object.assign(existing, payload)
    return
  }

  memory.insert("OrganizationSchedulingPolicy", { id: "policy-a", ...payload })
}

async function requestDefaultSwap() {
  authenticate(AUTH_STAFF)
  return createSwap({
    sourceAssignmentId: "assign-ama-10",
    targetAssignmentId: "assign-kofi-12",
  })
}

beforeEach(() => {
  memory.reset()
  seed()
})

describe("shift swap lifecycle", () => {
  it("creates a pending swap without mutating assignments", async () => {
    const swap = await requestDefaultSwap()

    expect(swap.status).toBe("PENDING")
    expect(swap.requesterStaffId).toBe("staff-ama")
    expect(swap.targetStaffId).toBe("staff-kofi")
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-ama-10")?.staffId).toBe(
      "staff-ama",
    )
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-kofi-12")?.staffId).toBe(
      "staff-kofi",
    )
  })

  it("completes a pending swap by exchanging staff", async () => {
    const created = await requestDefaultSwap()
    authenticate(AUTH_HEAD)
    const completed = await approveSwap(String(created.id))

    expect(completed.status).toBe("COMPLETED")
    expect(completed.reviewedByUserId).toBe(USER_HEAD)
    expect(completed.completedAt).toBeTruthy()
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-ama-10")).toMatchObject({
      staffId: "staff-kofi",
      professionId: "prof-nurse",
      date: "2026-09-10",
      shiftTypeId: "shift-day",
      departmentId: "dept-a",
      rosterId: "roster-a",
    })
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-kofi-12")).toMatchObject({
      staffId: "staff-ama",
      professionId: "prof-nurse",
      date: "2026-09-12",
    })
  })

  it("rejects a pending swap without mutating assignments", async () => {
    const created = await requestDefaultSwap()
    authenticate(AUTH_HEAD)
    const rejected = await rejectSwap({
      id: String(created.id),
      reviewNotes: "Coverage risk",
    })

    expect(rejected.status).toBe("REJECTED")
    expect(rejected.reviewNotes).toBe("Coverage risk")
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-ama-10")?.staffId).toBe(
      "staff-ama",
    )
  })

  it("lets the requester cancel a pending swap", async () => {
    const created = await requestDefaultSwap()
    const cancelled = await cancelSwap(String(created.id))
    expect(cancelled.status).toBe("CANCELLED")
  })

  it("rejects invalid lifecycle transitions", async () => {
    const created = await requestDefaultSwap()
    authenticate(AUTH_HEAD)
    await approveSwap(String(created.id))

    await expect(rejectSwap({ id: String(created.id) })).rejects.toMatchObject({
      code: "SWAP_NOT_PENDING",
    })
    await expect(approveSwap(String(created.id))).rejects.toMatchObject({
      code: "SWAP_NOT_PENDING",
    })
    authenticate(AUTH_STAFF)
    await expect(cancelSwap(String(created.id))).rejects.toMatchObject({
      code: "SWAP_NOT_PENDING",
    })
  })

  it("does not complete a rejected swap", async () => {
    const created = await requestDefaultSwap()
    authenticate(AUTH_HEAD)
    await rejectSwap({ id: String(created.id) })
    await expect(approveSwap(String(created.id))).rejects.toMatchObject({
      code: "SWAP_NOT_PENDING",
    })
  })
})

describe("shift swap authorization", () => {
  it("lets staff request a swap for their own assignment", async () => {
    const swap = await requestDefaultSwap()
    expect(swap.requestedByUserId).toBe(USER_STAFF)
  })

  it("does not let staff request a swap for someone else's assignment", async () => {
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-kofi-12",
        targetAssignmentId: "assign-ama-10",
      }),
    ).rejects.toMatchObject({ code: "SWAP_NOT_YOURS" })
  })

  it("does not let staff approve a swap", async () => {
    const created = await requestDefaultSwap()
    await expect(approveSwap(String(created.id))).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("does not let a viewer approve or reject", async () => {
    const created = await requestDefaultSwap()
    authenticate(AUTH_VIEWER)
    await expect(approveSwap(String(created.id))).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(rejectSwap({ id: String(created.id) })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })

  it("hides cross-tenant swaps", async () => {
    const created = await requestDefaultSwap()
    authenticate(AUTH_B)
    await expect(getSwap(String(created.id))).rejects.toMatchObject({ code: "SWAP_NOT_FOUND" })
    expect(await listSwaps()).toEqual([])
  })

  it("does not let staff list unrelated swaps", async () => {
    await requestDefaultSwap()
    const listed = await listSwaps()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.requesterStaffId).toBe("staff-ama")
  })

  it("returns STAFF_NOT_LINKED when a staff user has no staff record", async () => {
    memory.insert("User", {
      id: "user-unlinked-login",
      authProviderId: "supabase-unlinked",
      email: "unlinked@test.local",
    })
    memory.insert("OrganizationMember", {
      id: "membership-unlinked",
      organizationId: ORG_A,
      userId: "user-unlinked-login",
      roleId: ROLE_STAFF,
      status: "ACTIVE",
    })

    authenticate("supabase-unlinked")
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-kofi-12",
      }),
    ).rejects.toMatchObject({ code: "STAFF_NOT_LINKED" })
  })
})

describe("shift swap eligibility", () => {
  it("rejects an inactive target", async () => {
    insertAssignment({ id: "assign-inactive-11", staffId: "staff-inactive", date: "2026-09-11" })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-inactive-11",
      }),
    ).rejects.toMatchObject({ code: "SWAP_STAFF_INACTIVE" })
  })

  it("rejects a different organization assignment", async () => {
    insertAssignment({
      id: "assign-b",
      staffId: "staff-b",
      date: "2026-09-12",
      organizationId: ORG_B,
      rosterId: "roster-b",
      departmentId: "dept-b",
    })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-b",
      }),
    ).rejects.toMatchObject({ code: "SWAP_NOT_FOUND" })
  })

  it("rejects a different department on the same roster", async () => {
    insertAssignment({
      id: "assign-kofi-wrong-dept",
      staffId: "staff-kofi",
      date: "2026-09-11",
      departmentId: "dept-icu",
    })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-kofi-wrong-dept",
      }),
    ).rejects.toMatchObject({ code: "SWAP_NOT_ELIGIBLE" })
  })

  it("rejects swapping with the same staff member", async () => {
    insertAssignment({ id: "assign-ama-12", staffId: "staff-ama", date: "2026-09-12" })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-ama-12",
      }),
    ).rejects.toMatchObject({ code: "SWAP_NOT_ELIGIBLE" })
  })

  it("rejects a profession mismatch using the scheduling engine", async () => {
    insertAssignment({
      id: "assign-pharmacist-12",
      staffId: "staff-pharmacist",
      date: "2026-09-12",
      professionId: "prof-pharmacist",
    })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-pharmacist-12",
      }),
    ).rejects.toMatchObject({ code: "SWAP_SCHEDULING_CONFLICT" })
  })

  it("requires the target to own the target assignment", async () => {
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "missing-assignment",
      }),
    ).rejects.toMatchObject({ code: "SWAP_NOT_FOUND" })
  })

  it("rejects a roster mismatch", async () => {
    insertAssignment({
      id: "assign-kofi-week2",
      staffId: "staff-kofi",
      date: "2026-09-15",
      rosterId: "roster-a2",
    })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-kofi-week2",
      }),
    ).rejects.toMatchObject({ code: "SWAP_ROSTER_MISMATCH" })
  })

  it("rejects a second pending swap on the same assignment", async () => {
    await requestDefaultSwap()
    insertAssignment({ id: "assign-kofi-11", staffId: "staff-kofi", date: "2026-09-11" })
    insertAssignment({
      id: "assign-pharmacist-11",
      staffId: "staff-pharmacist",
      date: "2026-09-11",
      professionId: "prof-pharmacist",
    })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-kofi-11",
      }),
    ).rejects.toMatchObject({ code: "SWAP_ASSIGNMENT_ALREADY_IN_SWAP" })
  })
})

describe("shift swap scheduling and leave", () => {
  it("rejects an overlapping resulting schedule", async () => {
    insertAssignment({ id: "assign-ama-11", staffId: "staff-ama", date: "2026-09-11" })
    insertAssignment({
      id: "assign-kofi-late-10",
      staffId: "staff-kofi",
      date: "2026-09-10",
      shiftTypeId: "shift-late",
      startTime: "14:00",
      endTime: "22:00",
    })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-11",
        targetAssignmentId: "assign-kofi-late-10",
      }),
    ).rejects.toMatchObject({ code: "SWAP_SCHEDULING_CONFLICT" })
  })

  it("blocks approved leave and ignores pending, rejected, and cancelled leave", async () => {
    memory.insert("LeaveRequest", {
      id: "leave-pending",
      organizationId: ORG_A,
      staffId: "staff-kofi",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-10",
      status: "PENDING",
      requestedByUserId: USER_HEAD,
    })
    authenticate(AUTH_STAFF)
    const pendingLeaveSwap = await createSwap({
      sourceAssignmentId: "assign-ama-10",
      targetAssignmentId: "assign-kofi-12",
    })
    expect(pendingLeaveSwap.status).toBe("PENDING")

    memory.tables.LeaveRequest.find((row) => row.id === "leave-pending")!.status = "REJECTED"
    authenticate(AUTH_HEAD)
    await rejectSwap({ id: String(pendingLeaveSwap.id) })

    memory.insert("LeaveRequest", {
      id: "leave-cancelled",
      organizationId: ORG_A,
      staffId: "staff-kofi",
      leaveType: "SICK",
      startDate: "2026-09-10",
      endDate: "2026-09-10",
      status: "CANCELLED",
      requestedByUserId: USER_HEAD,
    })
    authenticate(AUTH_STAFF)
    const cancelledLeaveSwap = await createSwap({
      sourceAssignmentId: "assign-ama-10",
      targetAssignmentId: "assign-kofi-12",
    })
    expect(cancelledLeaveSwap.status).toBe("PENDING")
    authenticate(AUTH_STAFF)
    await cancelSwap(String(cancelledLeaveSwap.id))

    memory.insert("LeaveRequest", {
      id: "leave-approved",
      organizationId: ORG_A,
      staffId: "staff-kofi",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-10",
      status: "APPROVED",
      requestedByUserId: USER_HEAD,
    })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-kofi-12",
      }),
    ).rejects.toMatchObject({ code: "SWAP_SCHEDULING_CONFLICT" })
  })

  it("loads organization policy and rejects insufficient rest after the swap", async () => {
    const created = await requestDefaultSwap()
    insertAssignment({
      id: "assign-ama-11-night",
      staffId: "staff-ama",
      date: "2026-09-11",
      shiftTypeId: "shift-night",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
    })
    setPolicy({ minimumRestMinutes: 60 * 20 })
    authenticate(AUTH_HEAD)
    await expect(approveSwap(String(created.id))).rejects.toMatchObject({
      code: "SWAP_SCHEDULING_CONFLICT",
    })
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-ama-10")?.staffId).toBe(
      "staff-ama",
    )
  })

  it("rejects maximum weekly hours after the resulting schedule", async () => {
    insertAssignment({
      id: "assign-ama-08",
      staffId: "staff-ama",
      date: "2026-09-08",
    })
    insertAssignment({
      id: "assign-ama-09",
      staffId: "staff-ama",
      date: "2026-09-09",
    })
    setPolicy({ maximumWeeklyMinutes: 16 * 60 })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-kofi-12",
      }),
    ).rejects.toMatchObject({ code: "SWAP_SCHEDULING_CONFLICT" })
  })

  it("rejects consecutive day limits for both resulting schedules", async () => {
    insertAssignment({ id: "assign-ama-11", staffId: "staff-ama", date: "2026-09-11" })
    setPolicy({ maximumConsecutiveDays: 1 })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-kofi-12",
      }),
    ).rejects.toMatchObject({ code: "SWAP_SCHEDULING_CONFLICT" })
  })

  it("rejects night and weekend limits from organization policy", async () => {
    insertAssignment({
      id: "assign-ama-08-night",
      staffId: "staff-ama",
      date: "2026-09-08",
      shiftTypeId: "shift-night",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
    })
    insertAssignment({
      id: "assign-kofi-11-night",
      staffId: "staff-kofi",
      date: "2026-09-11",
      shiftTypeId: "shift-night",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
    })
    setPolicy({ maximumNightShiftsPerWeek: 1 })
    authenticate(AUTH_STAFF)
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-kofi-11-night",
      }),
    ).rejects.toMatchObject({ code: "SWAP_SCHEDULING_CONFLICT" })

    setPolicy({ maximumWeekendShifts: 0 })
    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-kofi-12",
      }),
    ).rejects.toMatchObject({ code: "SWAP_SCHEDULING_CONFLICT" })
  })
})

describe("shift swap roster lifecycle", () => {
  it("completes a draft roster swap", async () => {
    const created = await requestDefaultSwap()
    authenticate(AUTH_HEAD)
    await approveSwap(String(created.id))
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-ama-10")?.staffId).toBe(
      "staff-kofi",
    )
  })

  it("cannot complete an in-review roster swap", async () => {
    const created = await requestDefaultSwap()
    memory.tables.Roster.find((row) => row.id === "roster-a")!.status = "IN_REVIEW"
    authenticate(AUTH_HEAD)
    await expect(approveSwap(String(created.id))).rejects.toMatchObject({
      code: "SWAP_REQUIRES_DRAFT_ROSTER",
    })
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-ama-10")?.staffId).toBe(
      "staff-ama",
    )
  })

  it("cannot complete a published roster swap and leaves assignments unchanged", async () => {
    const created = await requestDefaultSwap()
    memory.tables.Roster.find((row) => row.id === "roster-a")!.status = "PUBLISHED"
    authenticate(AUTH_HEAD)
    await expect(approveSwap(String(created.id))).rejects.toMatchObject({
      code: "SWAP_REQUIRES_AMENDMENT",
    })
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-ama-10")).toMatchObject({
      staffId: "staff-ama",
      date: "2026-09-10",
      shiftTypeId: "shift-day",
    })
  })
})

describe("shift swap concurrency and state", () => {
  it("fails when the source assignment changed after the request", async () => {
    const created = await requestDefaultSwap()
    memory.tables.ShiftAssignment.find((row) => row.id === "assign-ama-10")!.staffId = "staff-kofi"
    authenticate(AUTH_HEAD)
    await expect(approveSwap(String(created.id))).rejects.toMatchObject({
      code: "SWAP_STATE_CHANGED",
    })
  })

  it("fails when the target assignment changed after the request", async () => {
    const created = await requestDefaultSwap()
    memory.tables.ShiftAssignment.find((row) => row.id === "assign-kofi-12")!.staffId = "staff-ama"
    authenticate(AUTH_HEAD)
    await expect(approveSwap(String(created.id))).rejects.toMatchObject({
      code: "SWAP_STATE_CHANGED",
    })
  })

  it("rolls back when assignment constraints reject the mutation", async () => {
    insertAssignment({
      id: "assign-kofi-same-slot",
      staffId: "staff-kofi",
      date: "2026-09-10",
    })
    authenticate(AUTH_STAFF)
    const created = await createSwap({
      sourceAssignmentId: "assign-ama-10",
      targetAssignmentId: "assign-kofi-same-slot",
    })
    authenticate(AUTH_HEAD)
    await expect(approveSwap(String(created.id))).rejects.toMatchObject({
      code: "SWAP_SCHEDULING_CONFLICT",
    })
    expect(memory.tables.ShiftAssignment.find((row) => row.id === "assign-ama-10")?.staffId).toBe(
      "staff-ama",
    )
    expect(
      memory.tables.ShiftAssignment.find((row) => row.id === "assign-kofi-same-slot")?.staffId,
    ).toBe("staff-kofi")
    expect(memory.tables.ShiftSwapRequest.find((row) => row.id === created.id)?.status).toBe(
      "PENDING",
    )
  })
})

