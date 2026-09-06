import { beforeEach, describe, expect, it, vi } from "vitest"

import { assignmentDateTimeWindow } from "@/lib/dates/assignment-window"
import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createDepartment, deleteDepartment, updateDepartment } from "@/modules/departments/services/departments"
import { approveLeave, cancelLeave, createLeave, listLeave, rejectLeave } from "@/modules/leave/services/leave"
import { createOrganizationProfession, deactivateOrganizationProfession, listProfessions, updateOrganizationProfession } from "@/modules/professions/services/professions"
import { getSchedulingPolicy, updateSchedulingPolicy } from "@/modules/organizations/services/scheduling-policy"
import { createAssignment, deleteAssignment } from "@/modules/rosters/services/assignments"
import {
  deleteRoster,
  publishRoster,
  returnRosterToDraft,
  submitRosterForReview,
} from "@/modules/rosters/services/lifecycle"
import { createRoster, listRosters, updateRoster } from "@/modules/rosters/services/rosters"
import { approveSwap } from "@/modules/shift-swaps/services/approve-swap"
import { cancelSwap } from "@/modules/shift-swaps/services/cancel-swap"
import { createSwap } from "@/modules/shift-swaps/services/create-swap"
import { rejectSwap } from "@/modules/shift-swaps/services/reject-swap"
import { listSwaps } from "@/modules/shift-swaps/services/swaps"
import {
  createShiftType,
  deactivateShiftType,
  listShiftTypes,
  updateShiftType,
} from "@/modules/shifts/services/shift-types"
import {
  createStaffingRequirement,
  deleteStaffingRequirement,
  listStaffingRequirements,
  updateStaffingRequirement,
} from "@/modules/shifts/services/staffing-requirements"
import {
  assignDepartmentHead,
  clearDepartmentHead,
  createStaff,
  deactivateStaff,
  listStaff,
  updateStaff,
} from "@/modules/staff/services/staff"

const AUTH_ADMIN = "auth-admin"
const AUTH_STAFF = "auth-staff"
const USER_ADMIN = "user-admin"
const USER_STAFF = "user-staff"
const USER_STAFF_B = "user-staff-b"
const ORG_A = "org-a"
const ROLE_ADMIN = "role-admin"
const ROLE_STAFF = "role-staff"
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

function grantAll(roleId: string) {
  for (const key of Object.values(permissions)) {
    const permissionId = `perm-${key}`
    if (!memory.tables.Permission.some((row) => row.id === permissionId)) {
      memory.insert("Permission", { id: permissionId, key })
    }
    memory.insert("RolePermission", { roleId, permissionId })
  }
}

function grant(roleId: string, key: string) {
  const permissionId = `perm-${key}`
  if (!memory.tables.Permission.some((row) => row.id === permissionId)) {
    memory.insert("Permission", { id: permissionId, key })
  }
  memory.insert("RolePermission", { roleId, permissionId })
}

function auditActions() {
  return memory.tables.AuditEvent.map((row) => String(row.action))
}

function insertAssignment(id: string, staffId: string, date: string) {
  const window = assignmentDateTimeWindow({
    date,
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    timeZone: TIME_ZONE,
  })

  memory.insert("ShiftAssignment", {
    id,
    organizationId: ORG_A,
    rosterId: "roster-swap",
    departmentId: "dept-a",
    staffId,
    shiftTypeId: "shift-day",
    professionId: "prof-nurse",
    date,
    shiftStartTime: "08:00",
    shiftEndTime: "16:00",
    isOvernight: false,
    startDateTime: window.start,
    endDateTime: window.end,
  })
}

function seed() {
  memory.insert("Organization", {
    id: ORG_A,
    name: "Hospital A",
    slug: "hospital-a",
    timezone: TIME_ZONE,
  })
  memory.insert("User", { id: USER_ADMIN, authProviderId: AUTH_ADMIN, email: "admin@test.local" })
  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "ama@test.local" })
  memory.insert("User", { id: USER_STAFF_B, authProviderId: "auth-staff-b", email: "kofi@test.local" })
  memory.insert("Role", { id: ROLE_ADMIN, organizationId: ORG_A, name: "SUPER_ADMIN" })
  memory.insert("Role", { id: ROLE_STAFF, organizationId: ORG_A, name: "STAFF" })
  grantAll(ROLE_ADMIN)
  grant(ROLE_STAFF, permissions.shiftSwapView)
  grant(ROLE_STAFF, permissions.shiftSwapRequest)
  grant(ROLE_STAFF, permissions.leaveView)
  grant(ROLE_STAFF, permissions.leaveCreate)
  grant(ROLE_STAFF, permissions.rosterView)
  memory.insert("OrganizationMember", {
    id: "membership-admin",
    organizationId: ORG_A,
    userId: USER_ADMIN,
    roleId: ROLE_ADMIN,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-staff",
    organizationId: ORG_A,
    userId: USER_STAFF,
    roleId: ROLE_STAFF,
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
    id: "roster-swap",
    organizationId: ORG_A,
    departmentId: "dept-a",
    name: "Swap week",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    status: "DRAFT",
    createdByUserId: USER_ADMIN,
  })
}

describe("audit domain integrations", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seed()
    authenticate(AUTH_ADMIN)
  })

  it("records roster, assignment, and lifecycle events", async () => {
    const roster = await createRoster({
      name: "September Nursing Roster",
      departmentId: "dept-a",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    })
    await updateRoster({
      id: String(roster.id),
      name: "September Nursing Roster",
      startDate: "2026-09-01",
      endDate: "2026-09-28",
    })
    const { assignment } = await createAssignment({
      rosterId: String(roster.id),
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })
    await deleteAssignment({ id: String(assignment.id) })
    await submitRosterForReview(String(roster.id))
    await returnRosterToDraft(String(roster.id))
    await submitRosterForReview(String(roster.id))
    await publishRoster(String(roster.id))

    const disposable = await createRoster({
      name: "Disposable",
      departmentId: "dept-a",
      startDate: "2026-10-01",
      endDate: "2026-10-07",
    })
    await deleteRoster(String(disposable.id))

    expect(auditActions()).toEqual(
      expect.arrayContaining([
        "ROSTER_CREATED",
        "ROSTER_UPDATED",
        "ASSIGNMENT_CREATED",
        "ASSIGNMENT_DELETED",
        "ROSTER_SUBMITTED_FOR_REVIEW",
        "ROSTER_RETURNED_TO_DRAFT",
        "ROSTER_PUBLISHED",
        "ROSTER_DELETED",
      ]),
    )
    expect(
      memory.tables.AuditEvent.find((row) => row.action === "ROSTER_CREATED")?.summary,
    ).toBe('Created roster "September Nursing Roster".')
  })

  it("does not audit ordinary roster, staff, department, or leave reads", async () => {
    await createRoster({
      name: "Read check",
      departmentId: "dept-a",
      startDate: "2026-09-01",
      endDate: "2026-09-02",
    })
    memory.tables.AuditEvent.length = 0

    await listRosters()
    await listStaff()
    await listLeave()
    await listShiftTypes()
    await listStaffingRequirements()
    await listProfessions()
    await getSchedulingPolicy()

    expect(memory.tables.AuditEvent).toHaveLength(0)
  })

  it("rolls back the business mutation when audit insertion fails", async () => {
    memory.failNextCreate("AuditEvent")

    await expect(
      createRoster({
        name: "Should not persist",
        departmentId: "dept-a",
        startDate: "2026-09-01",
        endDate: "2026-09-02",
      }),
    ).rejects.toMatchObject({ code: "FAILED" })

    expect(memory.tables.Roster.filter((row) => row.name === "Should not persist")).toHaveLength(0)
    expect(memory.tables.AuditEvent).toHaveLength(0)
  })

  it("rolls back leave create when audit insertion fails", async () => {
    memory.failNextCreate("AuditEvent")

    await expect(
      createLeave({
        staffId: "staff-ama",
        leaveType: "ANNUAL",
        startDate: "2026-09-20",
        endDate: "2026-09-21",
      }),
    ).rejects.toMatchObject({ code: "FAILED" })

    expect(memory.tables.LeaveRequest).toHaveLength(0)
  })

  it("records leave approve, reject, and cancel", async () => {
    const approved = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-20",
      endDate: "2026-09-21",
    })
    await approveLeave(String(approved.id))

    const rejected = await createLeave({
      staffId: "staff-kofi",
      leaveType: "SICK",
      startDate: "2026-09-22",
      endDate: "2026-09-22",
    })
    await rejectLeave(String(rejected.id))

    const cancelled = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-10-01",
      endDate: "2026-10-02",
    })
    await cancelLeave(String(cancelled.id))

    expect(auditActions()).toEqual(
      expect.arrayContaining([
        "LEAVE_CREATED",
        "LEAVE_APPROVED",
        "LEAVE_REJECTED",
        "LEAVE_CANCELLED",
      ]),
    )
  })

  it("records staff, department, profession, shift, requirement, and policy changes", async () => {
    await assignDepartmentHead({
      departmentId: "dept-a",
      staffId: "staff-ama",
    })
    await clearDepartmentHead({ departmentId: "dept-a" })

    const department = await createDepartment({ name: "ICU" })
    await updateDepartment({ id: String(department.id), name: "Intensive Care" })

    const profession = await createOrganizationProfession({ name: "Theatre Nurse" })
    await updateOrganizationProfession({
      id: String(profession.id),
      name: "Theatre Nurse",
      description: "OR",
    })
    await deactivateOrganizationProfession({ id: String(profession.id) })

    const shiftType = await createShiftType({
      name: "Evening",
      startTime: "16:00",
      endTime: "22:00",
      isOvernight: false,
    })
    await updateShiftType({
      id: String(shiftType.id),
      name: "Evening",
      startTime: "15:00",
      endTime: "23:00",
      isOvernight: false,
    })
    await deactivateShiftType({ id: String(shiftType.id) })

    const requirement = await createStaffingRequirement({
      departmentId: "dept-a",
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      requiredCount: 2,
    })
    await updateStaffingRequirement({
      id: String(requirement.id),
      departmentId: "dept-a",
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      requiredCount: 3,
    })
    await deleteStaffingRequirement({ id: String(requirement.id) })

    await updateSchedulingPolicy({
      minimumRestMinutes: 660,
      maximumWeeklyMinutes: 2880,
      maximumConsecutiveDays: 6,
      maximumNightShiftsPerWeek: 3,
      maximumWeekendShifts: 2,
    })

    const staff = await createStaff({
      firstName: "Efua",
      lastName: "Boateng",
      staffNumber: "NUR-100",
      professionId: "prof-nurse",
      departmentId: "dept-a",
      employmentStatus: "ACTIVE",
      employmentType: "FULL_TIME",
      phone: "0240000000",
      email: "efua@test.local",
    })
    expect(String(memory.tables.AuditEvent.at(-1)?.metadata ?? "")).not.toContain("0240000000")
    expect(String(memory.tables.AuditEvent.at(-1)?.metadata ?? "")).not.toContain("efua@test.local")

    await updateStaff({
      id: String(staff.id),
      firstName: "Efua",
      lastName: "Mensah",
      professionId: "prof-nurse",
      departmentId: "dept-a",
      employmentStatus: "ACTIVE",
      employmentType: "FULL_TIME",
    })
    await deactivateStaff({ id: String(staff.id) })

    await deleteDepartment({ id: String(department.id) })

    expect(auditActions()).toEqual(
      expect.arrayContaining([
        "DEPARTMENT_CREATED",
        "DEPARTMENT_UPDATED",
        "DEPARTMENT_HEAD_ASSIGNED",
        "DEPARTMENT_HEAD_REMOVED",
        "DEPARTMENT_DELETED",
        "PROFESSION_CREATED",
        "PROFESSION_UPDATED",
        "PROFESSION_DEACTIVATED",
        "SHIFT_TYPE_CREATED",
        "SHIFT_TYPE_UPDATED",
        "SHIFT_TYPE_DEACTIVATED",
        "STAFFING_REQUIREMENT_CREATED",
        "STAFFING_REQUIREMENT_UPDATED",
        "STAFFING_REQUIREMENT_DELETED",
        "SCHEDULING_POLICY_UPDATED",
        "STAFF_CREATED",
        "STAFF_UPDATED",
        "STAFF_DEACTIVATED",
      ]),
    )
  })

  it("records swap request, completion, rejection, and cancellation without assignment duplicates", async () => {
    insertAssignment("assign-ama-10", "staff-ama", "2026-09-10")
    insertAssignment("assign-kofi-12", "staff-kofi", "2026-09-12")
    insertAssignment("assign-ama-11", "staff-ama", "2026-09-11")
    insertAssignment("assign-kofi-13", "staff-kofi", "2026-09-13")
    insertAssignment("assign-ama-08", "staff-ama", "2026-09-08")
    insertAssignment("assign-kofi-09", "staff-kofi", "2026-09-09")

    authenticate(AUTH_STAFF)
    const completed = await createSwap({
      sourceAssignmentId: "assign-ama-10",
      targetAssignmentId: "assign-kofi-12",
    })
    authenticate(AUTH_ADMIN)
    await approveSwap(String(completed.id))

    authenticate(AUTH_STAFF)
    const rejected = await createSwap({
      sourceAssignmentId: "assign-ama-11",
      targetAssignmentId: "assign-kofi-13",
    })
    authenticate(AUTH_ADMIN)
    await rejectSwap({ id: String(rejected.id) })

    authenticate(AUTH_STAFF)
    const cancelled = await createSwap({
      sourceAssignmentId: "assign-ama-08",
      targetAssignmentId: "assign-kofi-09",
    })
    await cancelSwap(String(cancelled.id))

    expect(auditActions()).toEqual(
      expect.arrayContaining([
        "SHIFT_SWAP_REQUESTED",
        "SHIFT_SWAP_COMPLETED",
        "SHIFT_SWAP_REJECTED",
        "SHIFT_SWAP_CANCELLED",
      ]),
    )
    expect(auditActions().filter((action) => action.startsWith("ASSIGNMENT_"))).toHaveLength(0)

    const completedEvent = memory.tables.AuditEvent.find(
      (row) => row.action === "SHIFT_SWAP_COMPLETED",
    )
    expect(String(completedEvent?.summary ?? "").toLowerCase()).toContain("swap")
    expect(String(completedEvent?.metadata ?? "")).toContain("assign-ama-10")
    expect(String(completedEvent?.metadata ?? "")).toContain("assign-kofi-12")
  })

  it("does not audit swap list reads", async () => {
    await listSwaps()
    expect(memory.tables.AuditEvent).toHaveLength(0)
  })

  it("rolls back a swap request when audit insertion fails", async () => {
    insertAssignment("assign-ama-10", "staff-ama", "2026-09-10")
    insertAssignment("assign-kofi-12", "staff-kofi", "2026-09-12")
    authenticate(AUTH_STAFF)
    memory.failNextCreate("AuditEvent")

    await expect(
      createSwap({
        sourceAssignmentId: "assign-ama-10",
        targetAssignmentId: "assign-kofi-12",
      }),
    ).rejects.toMatchObject({ code: "FAILED" })

    expect(memory.tables.ShiftSwapRequest).toHaveLength(0)
    expect(memory.tables.AuditEvent).toHaveLength(0)
  })
})
