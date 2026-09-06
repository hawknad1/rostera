import { Temporal } from "temporal-polyfill"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { assignmentDateTimeWindow } from "@/lib/dates/assignment-window"
import { permissions } from "@/lib/permissions/permissions"
import { AttendanceError } from "@/modules/attendance/errors"
import { clockIn } from "@/modules/attendance/services/clock-in"
import { clockOut } from "@/modules/attendance/services/clock-out"
import { correctAttendance, reviewAttendance } from "@/modules/attendance/services/corrections"
import { listMissingAttendance } from "@/modules/attendance/services/missing"
import { getAttendance, listAttendance } from "@/modules/attendance/services/records"
import { OPEN_SESSION_KEY } from "@/modules/attendance/types/attendance"

const AUTH_STAFF = "supabase-auth-staff"
const AUTH_STAFF_B = "supabase-auth-staff-b"
const AUTH_HR = "supabase-auth-hr"
const AUTH_B = "supabase-auth-org-b"
const AUTH_TERMINATED = "supabase-auth-terminated"

const USER_STAFF = "user-staff"
const USER_STAFF_B = "user-staff-b"
const USER_HR = "user-hr"
const USER_B = "user-b"
const USER_TERMINATED = "user-terminated"

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

  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "ama@test.local" })
  memory.insert("User", { id: USER_STAFF_B, authProviderId: AUTH_STAFF_B, email: "kofi@test.local" })
  memory.insert("User", { id: USER_HR, authProviderId: AUTH_HR, email: "hr@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })
  memory.insert("User", {
    id: USER_TERMINATED,
    authProviderId: AUTH_TERMINATED,
    email: "term@test.local",
  })

  memory.insert("Role", { id: "role-staff", organizationId: ORG_A, name: "STAFF" })
  memory.insert("Role", { id: "role-hr", organizationId: ORG_A, name: "HR" })
  memory.insert("Role", { id: "role-b", organizationId: ORG_B, name: "STAFF" })

  grant("role-staff", permissions.attendanceView)
  grant("role-staff", permissions.attendanceClockIn)
  grant("role-staff", permissions.attendanceClockOut)
  grant("role-hr", permissions.attendanceView)
  grant("role-hr", permissions.attendanceCorrect)
  grant("role-hr", permissions.attendanceApprove)
  grant("role-hr", permissions.attendanceExport)
  grant("role-b", permissions.attendanceView)
  grant("role-b", permissions.attendanceClockIn)
  grant("role-b", permissions.attendanceClockOut)

  memory.insert("OrganizationMember", {
    id: "mem-staff",
    organizationId: ORG_A,
    userId: USER_STAFF,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "mem-staff-b",
    organizationId: ORG_A,
    userId: USER_STAFF_B,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "mem-hr",
    organizationId: ORG_A,
    userId: USER_HR,
    roleId: "role-hr",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "mem-term",
    organizationId: ORG_A,
    userId: USER_TERMINATED,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "mem-b",
    organizationId: ORG_B,
    userId: USER_B,
    roleId: "role-b",
    status: "ACTIVE",
  })

  memory.insert("Profession", { id: "prof-nurse", name: "Nurse", isActive: true })
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
    id: "staff-term",
    organizationId: ORG_A,
    userId: USER_TERMINATED,
    staffNumber: "NUR-003",
    firstName: "Yaw",
    lastName: "Asante",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "TERMINATED",
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

function insertPublishedAssignment(input?: { staffId?: string; date?: string; overnight?: boolean }) {
  const date = input?.date ?? "2026-09-10"
  const overnight = input?.overnight ?? false
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
  const window = assignmentDateTimeWindow({
    date,
    startTime: overnight ? "22:00" : "08:00",
    endTime: overnight ? "06:00" : "16:00",
    isOvernight: overnight,
    timeZone: "UTC",
  })
  memory.insert("ShiftAssignment", {
    id: "assign-1",
    organizationId: ORG_A,
    rosterId: "roster-v1",
    departmentId: "dept-a",
    staffId: input?.staffId ?? "staff-ama",
    shiftTypeId: "shift-day",
    professionId: "prof-nurse",
    date,
    shiftStartTime: overnight ? "22:00" : "08:00",
    shiftEndTime: overnight ? "06:00" : "16:00",
    isOvernight: overnight,
    startDateTime: window.start,
    endDateTime: window.end,
  })
}

beforeEach(() => {
  memory.reset()
  seed()
})

describe("attendance services", () => {
  it("clocks in against the published assignment and snapshots lateness", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)

    const record = await clockIn(Temporal.Instant.from("2026-09-10T08:07:00Z"))

    expect(record.staffId).toBe("staff-ama")
    expect(record.assignmentId).toBe("assign-1")
    expect(record.attendanceDate).toBe("2026-09-10")
    expect(record.status).toBe("OPEN")
    expect(record.lateMinutes).toBe(7)
    expect(record.exceptions.some((item) => item.type === "LATE_ARRIVAL")).toBe(true)
    expect(memory.tables.AuditEvent.some((row) => row.action === "ATTENDANCE_CLOCKED_IN")).toBe(true)
  })

  it("rejects a second open session", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    await clockIn(Temporal.Instant.from("2026-09-10T08:00:00Z"))

    await expect(clockIn(Temporal.Instant.from("2026-09-10T08:01:00Z"))).rejects.toMatchObject({
      code: "ALREADY_CLOCKED_IN",
    })
  })

  it("clocks out of the open session and records overtime", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    await clockIn(Temporal.Instant.from("2026-09-10T08:00:00Z"))
    const record = await clockOut(Temporal.Instant.from("2026-09-10T16:30:00Z"))

    expect(record.status).toBe("EXCEPTION")
    expect(record.overtimeMinutes).toBe(30)
    expect(record.actualMinutes).toBe(510)
    expect(record.events.map((event) => event.type)).toEqual(["CLOCK_IN", "CLOCK_OUT"])
  })

  it("rejects clock-out without an open session", async () => {
    authenticate(AUTH_STAFF)
    await expect(clockOut()).rejects.toMatchObject({ code: "NO_OPEN_ATTENDANCE" })
  })

  it("allows unscheduled attendance when policy permits it", async () => {
    authenticate(AUTH_STAFF)
    const record = await clockIn(Temporal.Instant.from("2026-09-10T09:00:00Z"))

    expect(record.assignmentId).toBeNull()
    expect(record.exceptions.some((item) => item.type === "UNSCHEDULED_ATTENDANCE")).toBe(true)
  })

  it("keeps overnight attendanceDate on the assignment date", async () => {
    insertPublishedAssignment({ overnight: true })
    authenticate(AUTH_STAFF)
    const record = await clockIn(Temporal.Instant.from("2026-09-11T05:00:00Z"))

    expect(record.attendanceDate).toBe("2026-09-10")
    expect(record.assignmentId).toBe("assign-1")
  })

  it("uses the organization timezone for unscheduled attendanceDate", async () => {
    authenticate(AUTH_B)
    const record = await clockIn(Temporal.Instant.from("2026-09-10T12:00:00Z"))

    expect(record.organizationId).toBe(ORG_B)
    expect(record.attendanceDate).toBe("2026-09-11")
  })

  it("rejects inactive staff", async () => {
    authenticate(AUTH_TERMINATED)
    await expect(clockIn()).rejects.toMatchObject({ code: "STAFF_INACTIVE" })
  })

  it("excludes approved leave from missing attendance", async () => {
    insertPublishedAssignment()
    memory.insert("LeaveRequest", {
      id: "leave-1",
      organizationId: ORG_A,
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-10",
      status: "APPROVED",
      requestedByUserId: USER_STAFF,
    })
    authenticate(AUTH_HR)

    const missing = await listMissingAttendance({ date: "2026-09-10" })
    expect(missing.map((row) => row.staffId)).not.toContain("staff-ama")
  })

  it("lists scheduled staff without attendance as missing", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_HR)
    const missing = await listMissingAttendance({ date: "2026-09-10" })
    expect(missing.map((row) => row.staffId)).toContain("staff-ama")
  })

  it("lets HR correct a missed clock-out without deleting events", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    const opened = await clockIn(Temporal.Instant.from("2026-09-10T08:07:00Z"))
    authenticate(AUTH_HR)

    const corrected = await correctAttendance({
      id: opened.id,
      clockOut: "2026-09-10T16:12:00Z",
      reason: "Forgot to clock out",
    })

    expect(corrected.status).toBe("CORRECTED")
    expect(corrected.events.map((event) => event.type)).toEqual(["CLOCK_IN", "MANUAL_CLOCK_OUT"])
    expect(corrected.notes).toBe("Forgot to clock out")
  })

  it("requires a correction reason", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    const opened = await clockIn(Temporal.Instant.from("2026-09-10T08:00:00Z"))
    authenticate(AUTH_HR)

    await expect(
      correctAttendance({ id: opened.id, clockOut: "2026-09-10T16:00:00Z", reason: "   " }),
    ).rejects.toBeInstanceOf(AttendanceError)
  })

  it("approves a corrected record", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    const opened = await clockIn(Temporal.Instant.from("2026-09-10T08:00:00Z"))
    authenticate(AUTH_HR)
    await correctAttendance({
      id: opened.id,
      clockOut: "2026-09-10T16:00:00Z",
      reason: "Missed clock-out",
    })
    const reviewed = await reviewAttendance({ id: opened.id, decision: "APPROVE" })
    expect(reviewed.reviewStatus).toBe("APPROVED")
  })

  it("voids a record without deleting history", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    const opened = await clockIn(Temporal.Instant.from("2026-09-10T08:00:00Z"))
    authenticate(AUTH_HR)
    const voided = await reviewAttendance({ id: opened.id, decision: "VOID", notes: "Duplicate" })

    expect(voided.status).toBe("VOIDED")
    expect(voided.events.some((event) => event.type === "VOID")).toBe(true)
    expect(memory.tables.AttendanceRecord).toHaveLength(1)
  })

  it("does not let staff read another staff member's attendance", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    const opened = await clockIn(Temporal.Instant.from("2026-09-10T08:00:00Z"))
    authenticate(AUTH_STAFF_B)

    await expect(getAttendance(opened.id)).rejects.toMatchObject({
      code: "UNAUTHORIZED_ATTENDANCE_ACCESS",
    })
  })

  it("rejects cross-tenant attendance access as not found", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    const opened = await clockIn(Temporal.Instant.from("2026-09-10T08:00:00Z"))
    authenticate(AUTH_B)

    await expect(getAttendance(opened.id)).rejects.toMatchObject({
      code: "ATTENDANCE_NOT_FOUND",
    })
  })

  it("rejects unauthorized corrections", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    const opened = await clockIn(Temporal.Instant.from("2026-09-10T08:00:00Z"))

    await expect(
      correctAttendance({
        id: opened.id,
        clockOut: "2026-09-10T16:00:00Z",
        reason: "Self edit",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("ignores client-supplied staff identity because clock-in derives it server-side", async () => {
    insertPublishedAssignment({ staffId: "staff-kofi" })
    authenticate(AUTH_STAFF)
    const record = await clockIn(Temporal.Instant.from("2026-09-10T09:00:00Z"))
    expect(record.staffId).toBe("staff-ama")
    expect(record.assignmentId).toBeNull()
  })

  it("does not rewrite attendance when a later roster version is published", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    const opened = await clockIn(Temporal.Instant.from("2026-09-10T08:00:00Z"))
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

    authenticate(AUTH_HR)
    const listed = await listAttendance({ date: "2026-09-10" })
    expect(listed[0]?.id).toBe(opened.id)
    expect(listed[0]?.assignmentId).toBe("assign-1")
    expect(listed[0]?.rosterId).toBe("roster-v1")
  })

  it("does not rewrite snapshot minutes when policy changes", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    await clockIn(Temporal.Instant.from("2026-09-10T08:07:00Z"))
    await clockOut(Temporal.Instant.from("2026-09-10T16:00:00Z"))

    const policyRow = memory.tables.OrganizationAttendancePolicy.find(
      (row) => row.organizationId === ORG_A,
    )
    if (policyRow) {
      policyRow.lateThresholdMinutes = 15
    }

    authenticate(AUTH_HR)
    const listed = await listAttendance({ date: "2026-09-10" })
    expect(listed[0]?.lateMinutes).toBe(7)
  })

  it("rolls back clock-in when audit write fails", async () => {
    insertPublishedAssignment()
    authenticate(AUTH_STAFF)
    memory.failNextCreate("AuditEvent")

    await expect(clockIn(Temporal.Instant.from("2026-09-10T08:00:00Z"))).rejects.toMatchObject({
      code: "FAILED",
    })
    expect(memory.tables.AttendanceRecord).toHaveLength(0)
    expect(memory.tables.AttendanceEvent).toHaveLength(0)
  })

  it("uses the open-session unique key as a concurrency backstop", async () => {
    insertPublishedAssignment()
    memory.insert("AttendanceRecord", {
      id: "open-1",
      organizationId: ORG_A,
      staffId: "staff-ama",
      attendanceDate: "2026-09-10",
      status: "OPEN",
      source: "STAFF_PWA",
      openSessionKey: OPEN_SESSION_KEY,
      actualClockInDateTime: "2026-09-10T08:00:00Z",
    })
    authenticate(AUTH_STAFF)

    await expect(clockIn(Temporal.Instant.from("2026-09-10T08:05:00Z"))).rejects.toMatchObject({
      code: "ALREADY_CLOCKED_IN",
    })
  })
})
