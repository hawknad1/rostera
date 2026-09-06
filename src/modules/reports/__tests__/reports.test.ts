import { Temporal } from "temporal-polyfill"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { assignmentDateTimeWindow } from "@/lib/dates/assignment-window"
import { permissions } from "@/lib/permissions/permissions"
import { getOperationsOverview } from "@/modules/reports/services/overview"
import { exportReport } from "@/modules/reports/services/exports"
import { listAttendanceReport } from "@/modules/reports/services/attendance"
import { listLeaveReport } from "@/modules/reports/services/leave"
import { listStaffingReport } from "@/modules/reports/services/staffing"
import { listStaffWorkloadReport } from "@/modules/reports/services/workload"
import { loadReportDataset } from "@/modules/reports/services/dataset"

const AUTH_HR = "supabase-auth-hr"
const AUTH_STAFF = "supabase-auth-staff"
const AUTH_B = "supabase-auth-org-b"
const AUTH_VIEW = "supabase-auth-view"

const USER_HR = "user-hr"
const USER_STAFF = "user-staff"
const USER_B = "user-b"
const USER_VIEW = "user-view"

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

vi.mock("@/modules/notifications/services/emit", () => ({
  enqueueDomainNotification: vi.fn(),
  processDomainNotification: vi.fn(),
}))

function authenticate(authProviderId: string) {
  getAuthUser.mockResolvedValue({ id: authProviderId })
}

function grant(roleId: string, key: string) {
  const permission = memory.tables.Permission.find((row) => row.key === key)
  if (!permission) {
    throw new Error(`missing ${key}`)
  }
  memory.insert("RolePermission", { roleId, permissionId: permission.id })
}

function windowFor(
  date: string,
  startTime: string,
  endTime: string,
  isOvernight: boolean,
  timeZone = "UTC",
) {
  return assignmentDateTimeWindow({ date, startTime, endTime, isOvernight, timeZone })
}

function seed() {
  for (const key of Object.values(permissions)) {
    memory.insert("Permission", { id: `perm-${key}`, key })
  }

  memory.insert("Organization", {
    id: ORG_A,
    name: "Hospital A",
    slug: "hospital-a",
    timezone: "UTC",
  })
  memory.insert("Organization", {
    id: ORG_B,
    name: "Hospital B",
    slug: "hospital-b",
    timezone: "Pacific/Auckland",
  })

  memory.insert("User", { id: USER_HR, authProviderId: AUTH_HR, email: "hr@test.local" })
  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "ama@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })
  memory.insert("User", { id: USER_VIEW, authProviderId: AUTH_VIEW, email: "view@test.local" })

  memory.insert("Role", { id: "role-hr", organizationId: ORG_A, name: "HR" })
  memory.insert("Role", { id: "role-staff", organizationId: ORG_A, name: "STAFF" })
  memory.insert("Role", { id: "role-view", organizationId: ORG_A, name: "SUPERVISOR" })
  memory.insert("Role", { id: "role-b", organizationId: ORG_B, name: "HR" })

  grant("role-hr", permissions.reportsView)
  grant("role-hr", permissions.reportsExport)
  grant("role-view", permissions.reportsView)
  grant("role-b", permissions.reportsView)
  grant("role-b", permissions.reportsExport)
  grant("role-staff", permissions.attendanceView)

  memory.insert("OrganizationMember", {
    id: "mem-hr",
    organizationId: ORG_A,
    userId: USER_HR,
    roleId: "role-hr",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "mem-staff",
    organizationId: ORG_A,
    userId: USER_STAFF,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "mem-view",
    organizationId: ORG_A,
    userId: USER_VIEW,
    roleId: "role-view",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "mem-b",
    organizationId: ORG_B,
    userId: USER_B,
    roleId: "role-b",
    status: "ACTIVE",
  })

  memory.insert("Profession", {
    id: "prof-nurse",
    name: "Nurse",
    isActive: true,
    organizationId: null,
  })
  memory.insert("Department", { id: "dept-a", organizationId: ORG_A, name: "Emergency" })
  memory.insert("Department", { id: "dept-b", organizationId: ORG_B, name: "Emergency" })
  memory.insert("ShiftType", {
    id: "shift-day",
    organizationId: ORG_A,
    name: "Day Duty",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-night",
    organizationId: ORG_A,
    name: "Night Duty",
    startTime: "22:00",
    endTime: "06:00",
    isOvernight: true,
    isActive: true,
  })

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
    id: "staff-formula",
    organizationId: ORG_A,
    userId: USER_VIEW,
    staffNumber: "NUR-002",
    firstName: "=CMD(1)",
    lastName: "Danger",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-b",
    organizationId: ORG_B,
    userId: USER_B,
    staffNumber: "NUR-001",
    firstName: "Abena",
    lastName: "Sarpong",
    professionId: "prof-nurse",
    departmentId: "dept-b",
    employmentStatus: "ACTIVE",
  })
}

function insertAssignment(input: {
  id: string
  rosterId: string
  staffId?: string
  date: string
  startTime: string
  endTime: string
  isOvernight?: boolean
  shiftTypeId?: string
  timeZone?: string
}) {
  const overnight = input.isOvernight ?? false
  const window = windowFor(
    input.date,
    input.startTime,
    input.endTime,
    overnight,
    input.timeZone ?? "UTC",
  )
  memory.insert("ShiftAssignment", {
    id: input.id,
    organizationId: ORG_A,
    rosterId: input.rosterId,
    departmentId: "dept-a",
    staffId: input.staffId ?? "staff-ama",
    shiftTypeId: input.shiftTypeId ?? "shift-day",
    professionId: "prof-nurse",
    date: input.date,
    shiftStartTime: input.startTime,
    shiftEndTime: input.endTime,
    isOvernight: overnight,
    startDateTime: window.start,
    endDateTime: window.end,
  })
}

beforeEach(() => {
  memory.reset()
  seed()
})

const PERIOD = { dateFrom: "2026-09-10", dateTo: "2026-09-10" }

describe("report roster versions", () => {
  it("does not double-count V1 and V2 published assignments", async () => {
    memory.insert("Roster", {
      id: "roster-v1",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 1,
      createdByUserId: USER_HR,
    })
    memory.insert("Roster", {
      id: "roster-v2",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 2,
      parentRosterId: "roster-v1",
      createdByUserId: USER_HR,
    })
    insertAssignment({
      id: "assign-v1",
      rosterId: "roster-v1",
      date: "2026-09-10",
      startTime: "08:00",
      endTime: "16:00",
    })
    insertAssignment({
      id: "assign-v2",
      rosterId: "roster-v2",
      date: "2026-09-10",
      startTime: "12:00",
      endTime: "20:00",
    })
    authenticate(AUTH_HR)

    const overview = await getOperationsOverview(PERIOD)
    expect(overview.planned.scheduledShifts).toBe(1)
    expect(overview.planned.scheduledHours).toBe(8)

    const historical = await getOperationsOverview({ ...PERIOD, rosterId: "roster-v1" })
    expect(historical.planned.scheduledHours).toBe(8)
    expect(historical.period.rosterMode).toBe("historical_version")
  })

  it("excludes draft versions from operational scheduled hours", async () => {
    memory.insert("Roster", {
      id: "roster-v1",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 1,
      createdByUserId: USER_HR,
    })
    memory.insert("Roster", {
      id: "roster-draft",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "DRAFT",
      seriesId: "series-ed",
      versionNumber: 2,
      parentRosterId: "roster-v1",
      createdByUserId: USER_HR,
    })
    insertAssignment({
      id: "assign-v1",
      rosterId: "roster-v1",
      date: "2026-09-10",
      startTime: "08:00",
      endTime: "16:00",
    })
    insertAssignment({
      id: "assign-draft",
      rosterId: "roster-draft",
      date: "2026-09-10",
      startTime: "00:00",
      endTime: "08:00",
    })
    authenticate(AUTH_HR)

    const overview = await getOperationsOverview(PERIOD)
    expect(overview.planned.scheduledShifts).toBe(1)
    expect(overview.planned.scheduledHours).toBe(8)
  })

  it("keeps historical attendance snapshots after a V2 amendment", async () => {
    memory.insert("Roster", {
      id: "roster-v1",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 1,
      createdByUserId: USER_HR,
    })
    insertAssignment({
      id: "assign-v1",
      rosterId: "roster-v1",
      date: "2026-09-10",
      startTime: "08:00",
      endTime: "16:00",
    })
    memory.insert("AttendanceRecord", {
      id: "att-1",
      organizationId: ORG_A,
      staffId: "staff-ama",
      rosterId: "roster-v1",
      assignmentId: "assign-v1",
      attendanceDate: "2026-09-10",
      actualClockInDateTime: Temporal.Instant.from("2026-09-10T08:05:00Z"),
      actualClockOutDateTime: Temporal.Instant.from("2026-09-10T16:10:00Z"),
      scheduledMinutes: 480,
      actualMinutes: 485,
      lateMinutes: 5,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 10,
      status: "COMPLETED",
      reviewStatus: "UNREVIEWED",
      source: "STAFF_PWA",
    })
    memory.insert("Roster", {
      id: "roster-v2",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 2,
      parentRosterId: "roster-v1",
      createdByUserId: USER_HR,
    })
    insertAssignment({
      id: "assign-v2",
      rosterId: "roster-v2",
      date: "2026-09-10",
      startTime: "12:00",
      endTime: "20:00",
    })
    authenticate(AUTH_HR)

    const overview = await getOperationsOverview(PERIOD)
    expect(overview.planned.scheduledHours).toBe(8)
    expect(overview.attendance.workedHours).toBe(8.08)
    expect(overview.attendance.lateMinutes).toBe(5)

    const attendance = await listAttendanceReport(PERIOD)
    expect(attendance.items[0]?.scheduledHours).toBe(8)
    expect(attendance.items[0]?.workedHours).toBe(8.08)
    expect(attendance.items[0]?.clockIn).toBe("08:05")
  })

  it("does not recalculate historical scheduled hours from a later shift type change", async () => {
    memory.insert("Roster", {
      id: "roster-v1",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 1,
      createdByUserId: USER_HR,
    })
    insertAssignment({
      id: "assign-v1",
      rosterId: "roster-v1",
      date: "2026-09-10",
      startTime: "08:00",
      endTime: "16:00",
    })
    const shiftType = memory.tables.ShiftType.find((row) => row.id === "shift-day")
    if (shiftType) {
      shiftType.startTime = "09:00"
      shiftType.endTime = "17:00"
    }
    authenticate(AUTH_HR)

    const overview = await getOperationsOverview(PERIOD)
    expect(overview.planned.scheduledHours).toBe(8)
  })
})

describe("report attendance and leave", () => {
  it("does not count approved leave as missing attendance", async () => {
    memory.insert("Roster", {
      id: "roster-v1",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 1,
      createdByUserId: USER_HR,
    })
    insertAssignment({
      id: "assign-v1",
      rosterId: "roster-v1",
      date: "2026-09-10",
      startTime: "08:00",
      endTime: "16:00",
    })
    memory.insert("LeaveRequest", {
      id: "leave-1",
      organizationId: ORG_A,
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      status: "APPROVED",
      requestedByUserId: USER_STAFF,
    })
    authenticate(AUTH_HR)

    const overview = await getOperationsOverview(PERIOD)
    expect(overview.attendance.missingAttendance).toBe(0)
    expect(overview.attendance.eligibleAssignments).toBe(0)
    expect(overview.attendance.completion.percent).toBeNull()
    expect(overview.leave.approvedLeaveDays).toBe(1)

    const leave = await listLeaveReport(PERIOD)
    expect(leave.summary.approved).toBe(1)
    expect(leave.page.items[0]?.days).toBe(3)
  })

  it("keeps overnight shifts on the assignment date", async () => {
    memory.insert("Roster", {
      id: "roster-v1",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 1,
      createdByUserId: USER_HR,
    })
    insertAssignment({
      id: "assign-night",
      rosterId: "roster-v1",
      date: "2026-09-10",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      shiftTypeId: "shift-night",
    })
    authenticate(AUTH_HR)

    const overview = await getOperationsOverview(PERIOD)
    expect(overview.planned.scheduledHours).toBe(8)
    expect(overview.planned.scheduledShifts).toBe(1)

    const nextDay = await getOperationsOverview({ dateFrom: "2026-09-11", dateTo: "2026-09-11" })
    expect(nextDay.planned.scheduledShifts).toBe(0)
  })

  it("does not show 100% coverage or attendance when there is no data", async () => {
    authenticate(AUTH_HR)
    const overview = await getOperationsOverview(PERIOD)
    expect(overview.attendance.completion.percent).toBeNull()
    expect(overview.attendance.punctuality.percent).toBeNull()
    expect(overview.coverage.fillRate.percent).toBeNull()
    expect(overview.staff.activeStaff).toBe(2)
  })
})

describe("staffing coverage", () => {
  it("uses staffing requirements rather than assignment counts", async () => {
    memory.insert("Roster", {
      id: "roster-v1",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 1,
      createdByUserId: USER_HR,
    })
    insertAssignment({
      id: "assign-v1",
      rosterId: "roster-v1",
      date: "2026-09-10",
      startTime: "08:00",
      endTime: "16:00",
    })
    memory.insert("StaffingRequirement", {
      id: "req-1",
      organizationId: ORG_A,
      departmentId: "dept-a",
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      requiredCount: 2,
    })
    authenticate(AUTH_HR)

    const page = await listStaffingReport(PERIOD)
    const cell = page.items.find((row) => row.date === "2026-09-10")
    expect(cell?.requiredCount).toBe(2)
    expect(cell?.assignedCount).toBe(1)
    expect(cell?.coveragePercent).toBe(50)
    expect(cell?.status).toBe("understaffed")
  })
})

describe("report security and export", () => {
  it("rejects staff without reports.view", async () => {
    authenticate(AUTH_STAFF)
    await expect(getOperationsOverview(PERIOD)).rejects.toMatchObject({
      code: "REPORT_UNAUTHORIZED",
    })
  })

  it("rejects export without reports.export", async () => {
    authenticate(AUTH_VIEW)
    await expect(exportReport("staff", PERIOD)).rejects.toMatchObject({
      code: "EXPORT_NOT_ALLOWED",
    })
  })

  it("does not return another organization's assignments", async () => {
    memory.insert("Roster", {
      id: "roster-v1",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 1,
      createdByUserId: USER_HR,
    })
    insertAssignment({
      id: "assign-v1",
      rosterId: "roster-v1",
      date: "2026-09-10",
      startTime: "08:00",
      endTime: "16:00",
    })
    authenticate(AUTH_B)

    const overview = await getOperationsOverview(PERIOD)
    expect(overview.planned.scheduledShifts).toBe(0)
    expect(overview.staff.activeStaff).toBe(1)
  })

  it("ignores a client organizationId and rejects foreign staff filters", async () => {
    authenticate(AUTH_HR)
    const dataset = await loadReportDataset({
      ...PERIOD,
      staffId: "staff-b",
    }).catch((error: unknown) => error)

    expect(dataset).toMatchObject({ code: "INVALID_FILTER" })

    const overview = await getOperationsOverview({
      ...PERIOD,
      ...( { organizationId: ORG_B } as object),
    })
    expect(overview.staff.activeStaff).toBe(2)
  })

  it("escapes formula-like staff names in CSV and scopes the export", async () => {
    authenticate(AUTH_HR)
    const csv = await exportReport("staff", PERIOD)
    expect(csv.csv).toContain('"\'=CMD(1) Danger"')
    expect(csv.csv).not.toContain("Abena")
    expect(csv.filename).toContain("staff")
  })
})

describe("staff workload", () => {
  it("separates scheduled hours from worked hours", async () => {
    memory.insert("Roster", {
      id: "roster-v1",
      organizationId: ORG_A,
      departmentId: "dept-a",
      name: "September Emergency",
      startDate: "2026-09-07",
      endDate: "2026-09-20",
      status: "PUBLISHED",
      seriesId: "series-ed",
      versionNumber: 1,
      createdByUserId: USER_HR,
    })
    insertAssignment({
      id: "assign-v1",
      rosterId: "roster-v1",
      date: "2026-09-10",
      startTime: "08:00",
      endTime: "16:00",
    })
    authenticate(AUTH_HR)

    const page = await listStaffWorkloadReport(PERIOD)
    const ama = page.items.find((row) => row.staffNumber === "NUR-001")
    expect(ama?.scheduledHours).toBe(8)
    expect(ama?.workedHours).toBe(0)
    expect(ama?.missingAttendance).toBe(1)
  })
})
