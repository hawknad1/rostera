import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import {
  approveLeave,
  cancelLeave,
  createLeave,
  getLeave,
  listLeave,
  rejectLeave,
} from "@/modules/leave/services/leave"

const AUTH_HR = "supabase-auth-hr"
const AUTH_STAFF = "supabase-auth-staff"
const AUTH_STAFF_B = "supabase-auth-staff-b"
const AUTH_VIEWER = "supabase-auth-viewer"
const AUTH_B = "supabase-auth-org-b"

const USER_HR = "user-hr"
const USER_STAFF = "user-staff"
const USER_STAFF_B = "user-staff-b"
const USER_VIEWER = "user-viewer"
const USER_B = "user-b"

const ORG_A = "org-a"
const ORG_B = "org-b"

const ROLE_HR = "role-hr"
const ROLE_STAFF = "role-staff"
const ROLE_VIEWER = "role-viewer"
const ROLE_B = "role-b"

const PERMISSION_IDS = {
  leaveView: "perm-leave-view",
  leaveCreate: "perm-leave-create",
  leaveApprove: "perm-leave-approve",
  leaveReject: "perm-leave-reject",
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

function authenticate(authProviderId: string) {
  getAuthUser.mockResolvedValue({ id: authProviderId })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function seed() {
  memory.insert("Permission", { id: PERMISSION_IDS.leaveView, key: permissions.leaveView })
  memory.insert("Permission", { id: PERMISSION_IDS.leaveCreate, key: permissions.leaveCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.leaveApprove, key: permissions.leaveApprove })
  memory.insert("Permission", { id: PERMISSION_IDS.leaveReject, key: permissions.leaveReject })

  memory.insert("Organization", { id: ORG_A, name: "Hospital A", slug: "hospital-a" })
  memory.insert("Organization", { id: ORG_B, name: "Hospital B", slug: "hospital-b" })

  memory.insert("User", { id: USER_HR, authProviderId: AUTH_HR, email: "hr@test.local" })
  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "ama@test.local" })
  memory.insert("User", {
    id: USER_STAFF_B,
    authProviderId: AUTH_STAFF_B,
    email: "kofi@test.local",
  })
  memory.insert("User", { id: USER_VIEWER, authProviderId: AUTH_VIEWER, email: "view@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })

  memory.insert("Role", { id: ROLE_HR, organizationId: ORG_A, name: "HR" })
  memory.insert("Role", { id: ROLE_STAFF, organizationId: ORG_A, name: "STAFF" })
  memory.insert("Role", { id: ROLE_VIEWER, organizationId: ORG_A, name: "SUPERVISOR" })
  memory.insert("Role", { id: ROLE_B, organizationId: ORG_B, name: "HR" })

  grant(ROLE_HR, PERMISSION_IDS.leaveView)
  grant(ROLE_HR, PERMISSION_IDS.leaveCreate)
  grant(ROLE_HR, PERMISSION_IDS.leaveApprove)
  grant(ROLE_HR, PERMISSION_IDS.leaveReject)
  grant(ROLE_STAFF, PERMISSION_IDS.leaveView)
  grant(ROLE_STAFF, PERMISSION_IDS.leaveCreate)
  grant(ROLE_VIEWER, PERMISSION_IDS.leaveView)
  grant(ROLE_B, PERMISSION_IDS.leaveView)
  grant(ROLE_B, PERMISSION_IDS.leaveCreate)
  grant(ROLE_B, PERMISSION_IDS.leaveApprove)
  grant(ROLE_B, PERMISSION_IDS.leaveReject)

  memory.insert("OrganizationMember", {
    id: "membership-hr",
    organizationId: ORG_A,
    userId: USER_HR,
    roleId: ROLE_HR,
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
    id: "staff-unlinked",
    organizationId: ORG_A,
    staffNumber: "NUR-003",
    firstName: "Efua",
    lastName: "Boateng",
    professionId: "prof-nurse",
    departmentId: "dept-a",
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
    firstName: "Abena",
    lastName: "Sarpong",
    professionId: "prof-nurse",
    departmentId: "dept-b",
    employmentStatus: "ACTIVE",
  })
}

async function createPending(overrides?: {
  staffId?: string
  startDate?: string
  endDate?: string
  leaveType?: "ANNUAL" | "SICK"
}) {
  return createLeave({
    staffId: overrides?.staffId ?? "staff-ama",
    leaveType: overrides?.leaveType ?? "ANNUAL",
    startDate: overrides?.startDate ?? "2026-09-10",
    endDate: overrides?.endDate ?? "2026-09-12",
  })
}

beforeEach(() => {
  memory.reset()
  seed()
})

describe("leave lifecycle", () => {
  it("creates leave as PENDING", async () => {
    authenticate(AUTH_HR)
    const leave = await createPending()

    expect(leave.status).toBe("PENDING")
    expect(leave.staffId).toBe("staff-ama")
    expect(leave.startDate).toBe("2026-09-10")
    expect(leave.endDate).toBe("2026-09-12")
    expect(leave.requestedByUserId).toBe(USER_HR)
  })

  it("approves pending leave", async () => {
    authenticate(AUTH_HR)
    const created = await createPending()
    const approved = await approveLeave(String(created.id))

    expect(approved.status).toBe("APPROVED")
    expect(approved.reviewedByUserId).toBe(USER_HR)
  })

  it("rejects pending leave", async () => {
    authenticate(AUTH_HR)
    const created = await createPending()
    const rejected = await rejectLeave(String(created.id))

    expect(rejected.status).toBe("REJECTED")
  })

  it("allows a staff member to cancel their own pending leave", async () => {
    authenticate(AUTH_STAFF)
    const created = await createPending({ staffId: "staff-ama" })
    const cancelled = await cancelLeave(String(created.id))

    expect(cancelled.status).toBe("CANCELLED")
  })

  it("rejects APPROVED → REJECTED and APPROVED → APPROVED", async () => {
    authenticate(AUTH_HR)
    const created = await createPending()
    await approveLeave(String(created.id))

    await expect(rejectLeave(String(created.id))).rejects.toMatchObject({
      code: "LEAVE_NOT_PENDING",
    })
    await expect(approveLeave(String(created.id))).rejects.toMatchObject({
      code: "LEAVE_NOT_PENDING",
    })
  })

  it("rejects REJECTED → APPROVED", async () => {
    authenticate(AUTH_HR)
    const created = await createPending()
    await rejectLeave(String(created.id))

    await expect(approveLeave(String(created.id))).rejects.toMatchObject({
      code: "LEAVE_NOT_PENDING",
    })
  })

  it("cancels approved leave for reviewers without deleting it", async () => {
    authenticate(AUTH_HR)
    const created = await createPending()
    await approveLeave(String(created.id))
    const cancelled = await cancelLeave(String(created.id))

    expect(cancelled.status).toBe("CANCELLED")
    expect(await getLeave(String(created.id))).toMatchObject({ status: "CANCELLED" })
  })
})

describe("leave authorization", () => {
  it("lets staff create leave for themselves", async () => {
    authenticate(AUTH_STAFF)
    const leave = await createLeave({
      leaveType: "SICK",
      startDate: "2026-09-10",
      endDate: "2026-09-11",
    })

    expect(leave.staffId).toBe("staff-ama")
  })

  it("does not let staff create leave for another staff member", async () => {
    authenticate(AUTH_STAFF)
    await expect(
      createLeave({
        staffId: "staff-kofi",
        leaveType: "ANNUAL",
        startDate: "2026-09-10",
        endDate: "2026-09-11",
      }),
    ).rejects.toMatchObject({ code: "LEAVE_NOT_YOURS" })
  })

  it("lets HR create leave on behalf of staff", async () => {
    authenticate(AUTH_HR)
    const leave = await createPending({ staffId: "staff-unlinked" })
    expect(leave.staffId).toBe("staff-unlinked")
    expect(leave.requestedByUserId).toBe(USER_HR)
  })

  it("does not let a viewer approve or reject", async () => {
    authenticate(AUTH_HR)
    const created = await createPending()

    authenticate(AUTH_VIEWER)
    await expect(approveLeave(String(created.id))).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(rejectLeave(String(created.id))).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("hides cross-tenant leave", async () => {
    authenticate(AUTH_HR)
    const created = await createPending()

    authenticate(AUTH_B)
    await expect(getLeave(String(created.id))).rejects.toMatchObject({ code: "LEAVE_NOT_FOUND" })
    const listed = await listLeave()
    expect(listed).toEqual([])
  })

  it("does not let staff list another staff member's leave", async () => {
    authenticate(AUTH_HR)
    await createPending({ staffId: "staff-kofi", startDate: "2026-10-01", endDate: "2026-10-02" })

    authenticate(AUTH_STAFF)
    const listed = await listLeave()
    expect(listed.every((row) => row.staffId === "staff-ama")).toBe(true)
  })

  it("does not let inactive staff receive new leave", async () => {
    authenticate(AUTH_HR)
    await expect(
      createLeave({
        staffId: "staff-inactive",
        leaveType: "ANNUAL",
        startDate: "2026-09-10",
        endDate: "2026-09-11",
      }),
    ).rejects.toMatchObject({ code: "STAFF_NOT_ACTIVE" })
  })

  it("does not approve pending leave for inactive staff", async () => {
    authenticate(AUTH_HR)
    const created = await createPending({ staffId: "staff-ama" })
    memory.tables.StaffProfile.find((row) => row.id === "staff-ama")!.employmentStatus = "TERMINATED"

    await expect(approveLeave(String(created.id))).rejects.toMatchObject({
      code: "STAFF_NOT_ACTIVE",
    })
    expect(memory.tables.LeaveRequest.find((row) => row.id === created.id)?.status).toBe("PENDING")
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
      createLeave({
        leaveType: "ANNUAL",
        startDate: "2026-09-10",
        endDate: "2026-09-11",
      }),
    ).rejects.toMatchObject({ code: "STAFF_NOT_LINKED" })
  })
})

describe("leave overlap", () => {
  it("rejects exact, partial, containing, and contained active overlaps", async () => {
    authenticate(AUTH_HR)
    await createPending({ startDate: "2026-09-10", endDate: "2026-09-15" })

    await expect(
      createPending({ startDate: "2026-09-10", endDate: "2026-09-15" }),
    ).rejects.toMatchObject({ code: "LEAVE_OVERLAP" })
    await expect(
      createPending({ startDate: "2026-09-13", endDate: "2026-09-17" }),
    ).rejects.toMatchObject({ code: "LEAVE_OVERLAP" })
    await expect(
      createPending({ startDate: "2026-09-08", endDate: "2026-09-20" }),
    ).rejects.toMatchObject({ code: "LEAVE_OVERLAP" })
    await expect(
      createPending({ startDate: "2026-09-12", endDate: "2026-09-14" }),
    ).rejects.toMatchObject({ code: "LEAVE_OVERLAP" })
  })

  it("allows adjacent ranges", async () => {
    authenticate(AUTH_HR)
    await createPending({ startDate: "2026-09-10", endDate: "2026-09-12" })
    const adjacent = await createPending({ startDate: "2026-09-13", endDate: "2026-09-15" })
    expect(adjacent.status).toBe("PENDING")
  })

  it("does not treat rejected or cancelled leave as active", async () => {
    authenticate(AUTH_HR)
    const rejected = await createPending({ startDate: "2026-09-10", endDate: "2026-09-12" })
    await rejectLeave(String(rejected.id))
    const replacement = await createPending({ startDate: "2026-09-10", endDate: "2026-09-12" })
    await cancelLeave(String(replacement.id))
    const again = await createPending({ startDate: "2026-09-10", endDate: "2026-09-12" })
    expect(again.status).toBe("PENDING")
  })

  it("blocks pending + pending overlap", async () => {
    authenticate(AUTH_HR)
    await createPending({ startDate: "2026-09-10", endDate: "2026-09-12" })
    await expect(
      createPending({ startDate: "2026-09-12", endDate: "2026-09-14" }),
    ).rejects.toMatchObject({ code: "LEAVE_OVERLAP" })
  })

  it("rejects an invalid date range in the service", async () => {
    authenticate(AUTH_HR)
    await expect(
      createLeave({
        staffId: "staff-ama",
        leaveType: "ANNUAL",
        startDate: "2026-02-31",
        endDate: "2026-03-01",
      }),
    ).rejects.toMatchObject({ code: "LEAVE_INVALID_DATE_RANGE" })
  })
})
