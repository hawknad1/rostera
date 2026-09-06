import { calendarDateRangesOverlap, isDateInInclusiveRange, isWeekendDate } from "@/lib/dates/calendar-date"
import { formatStaffName } from "@/modules/staff/labels"
import { selectCurrentPublishedRosters } from "@/modules/rosters/services/versions"
import type { AttendanceExceptionType, AttendanceStatus } from "@/modules/attendance/types/attendance"
import type { LeaveType } from "@/modules/leave/schemas/leave"
import type { LeaveStatus } from "@/modules/scheduling/types/leave"
import { reportError } from "@/modules/reports/errors"
import { reportFilterSchema } from "@/modules/reports/schemas/reports"
import {
  assignmentScheduledMinutes,
  clippedInclusiveDays,
  isCompletedAttendanceStatus,
  resolveReportDates,
} from "@/modules/reports/services/metrics"
import { reportExportAllowed, requireReportView } from "@/modules/reports/services/access"
import type {
  ReportFilterInput,
  ReportPeriod,
  ResolvedReportFilters,
} from "@/modules/reports/types/filters"
import type { ReportLookups } from "@/modules/reports/types/reports"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm

type DirectoryStaff = {
  id: string
  name: string
  staffNumber: string
  departmentId: string
  departmentName: string
  professionId: string
  professionName: string
  employmentStatus: string
}

export type PlannedAssignment = {
  id: string
  rosterId: string
  staffId: string
  departmentId: string
  professionId: string
  shiftTypeId: string
  date: string
  shiftStartTime: string
  shiftEndTime: string
  isOvernight: boolean
  scheduledMinutes: number
}

export type AttendanceFact = {
  id: string
  staffId: string
  departmentId: string
  assignmentId: string | null
  rosterId: string | null
  attendanceDate: string
  status: AttendanceStatus
  scheduledMinutes: number | null
  actualMinutes: number | null
  lateMinutes: number
  earlyDepartureMinutes: number
  overtimeMinutes: number
  clockIn: unknown
  clockOut: unknown
  shiftTypeId: string | null
  exceptionTypes: AttendanceExceptionType[]
  openExceptionCount: number
}

export type LeaveFact = {
  id: string
  staffId: string
  leaveType: LeaveType
  status: LeaveStatus
  startDate: string
  endDate: string
  durationDays: number
  daysInRange: number
}

export type RequirementFact = {
  departmentId: string
  shiftTypeId: string
  professionId: string
  requiredCount: number
}

export type ReportDataset = {
  organizationId: string
  period: ReportPeriod
  filters: ResolvedReportFilters
  staff: Map<string, DirectoryStaff>
  departments: Map<string, string>
  professions: Map<string, string>
  shiftTypes: Map<string, string>
  assignments: PlannedAssignment[]
  attendance: AttendanceFact[]
  leave: LeaveFact[]
  approvedLeave: LeaveFact[]
  requirements: RequirementFact[]
  publishedRosters: Array<{
    id: string
    name: string
    seriesId: string
    versionNumber: number
    departmentId: string
    startDate: string
    endDate: string
    status: string
  }>
}

const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  "OPEN",
  "COMPLETED",
  "MISSED",
  "EXCEPTION",
  "CORRECTED",
  "VOIDED",
]

const LEAVE_TYPES: readonly LeaveType[] = [
  "ANNUAL",
  "SICK",
  "MATERNITY",
  "PATERNITY",
  "STUDY",
  "COMPASSIONATE",
  "OTHER",
]

const LEAVE_STATUSES: readonly LeaveStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]

const EXCEPTION_TYPES: readonly AttendanceExceptionType[] = [
  "LATE_ARRIVAL",
  "EARLY_DEPARTURE",
  "MISSED_CLOCK_IN",
  "MISSED_CLOCK_OUT",
  "UNSCHEDULED_ATTENDANCE",
  "OVERTIME",
  "OUTSIDE_SCHEDULE",
]

function asInteger(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value
  }

  return fallback
}

function asAttendanceStatus(value: unknown): AttendanceStatus {
  return ATTENDANCE_STATUSES.includes(value as AttendanceStatus)
    ? (value as AttendanceStatus)
    : "OPEN"
}

function asLeaveType(value: unknown): LeaveType {
  return LEAVE_TYPES.includes(value as LeaveType) ? (value as LeaveType) : "OTHER"
}

function asLeaveStatus(value: unknown): LeaveStatus {
  return LEAVE_STATUSES.includes(value as LeaveStatus) ? (value as LeaveStatus) : "PENDING"
}

function asExceptionType(value: unknown): AttendanceExceptionType {
  return EXCEPTION_TYPES.includes(value as AttendanceExceptionType)
    ? (value as AttendanceExceptionType)
    : "OUTSIDE_SCHEDULE"
}

function matchesAssignmentFilters(
  assignment: {
    departmentId: string
    professionId: string
    staffId: string
    shiftTypeId: string
  },
  filters: ResolvedReportFilters,
) {
  if (filters.departmentId && assignment.departmentId !== filters.departmentId) {
    return false
  }

  if (filters.professionId && assignment.professionId !== filters.professionId) {
    return false
  }

  if (filters.staffId && assignment.staffId !== filters.staffId) {
    return false
  }

  if (filters.shiftTypeId && assignment.shiftTypeId !== filters.shiftTypeId) {
    return false
  }

  return true
}

async function assertOwnedFilters(
  orm: PublicOrm,
  organizationId: string,
  filters: ResolvedReportFilters,
) {
  if (filters.departmentId) {
    const department = await orm.public.Department.where({
      id: filters.departmentId,
      organizationId,
    }).first()
    if (!department) {
      throw reportError("INVALID_FILTER")
    }
  }

  if (filters.staffId) {
    const staff = await orm.public.StaffProfile.where({
      id: filters.staffId,
      organizationId,
    }).first()
    if (!staff) {
      throw reportError("INVALID_FILTER")
    }
  }

  if (filters.shiftTypeId) {
    const shiftType = await orm.public.ShiftType.where({
      id: filters.shiftTypeId,
      organizationId,
    }).first()
    if (!shiftType) {
      throw reportError("INVALID_FILTER")
    }
  }

  if (filters.professionId) {
    const profession = await orm.public.Profession.where({ id: filters.professionId }).first()
    if (
      !profession ||
      (profession.organizationId != null && String(profession.organizationId) !== organizationId)
    ) {
      throw reportError("INVALID_FILTER")
    }
  }

  if (filters.rosterId) {
    const roster = await orm.public.Roster.where({
      id: filters.rosterId,
      organizationId,
    }).first()
    if (!roster || String(roster.status) !== "PUBLISHED") {
      throw reportError("INVALID_FILTER")
    }
  }

  if (filters.rosterSeriesId) {
    const rosters = await orm.public.Roster.where({ organizationId }).all()
    const found = rosters.some(
      (roster) =>
        String(roster.organizationId) === organizationId &&
        String(roster.seriesId ?? roster.id) === filters.rosterSeriesId,
    )
    if (!found) {
      throw reportError("INVALID_FILTER")
    }
  }
}

export function parseReportFilters(input: ReportFilterInput): ReportFilterInput {
  const parsed = reportFilterSchema.safeParse(input)
  return parsed.success ? parsed.data : {}
}

export async function loadReportLookups(): Promise<ReportLookups> {
  const membership = await requireReportView()
  const organizationId = membership.organizationId
  const [departments, ownedProfessions, globalProfessions, staffRows, shiftTypes, rosters] =
    await Promise.all([
      db.orm.public.Department.where({ organizationId }).all(),
      db.orm.public.Profession.where({ organizationId }).all(),
      db.orm.public.Profession.where({ organizationId: null }).all(),
      db.orm.public.StaffProfile.where({ organizationId }).all(),
      db.orm.public.ShiftType.where({ organizationId }).all(),
      db.orm.public.Roster.where({ organizationId }).all(),
    ])

  const tenantDepartments = departments
    .filter((row) => String(row.organizationId) === organizationId)
    .map((row) => ({ id: String(row.id), name: String(row.name) }))
    .sort((left, right) => left.name.localeCompare(right.name))

  const professions = [...globalProfessions, ...ownedProfessions]
    .filter(
      (row) =>
        row.organizationId == null || String(row.organizationId) === organizationId,
    )
    .map((row) => ({ id: String(row.id), name: String(row.name) }))
    .sort((left, right) => left.name.localeCompare(right.name))

  const staff = staffRows
    .filter((row) => String(row.organizationId) === organizationId)
    .map((row) => ({
      id: String(row.id),
      name: formatStaffName({
        firstName: String(row.firstName),
        middleName: row.middleName == null ? null : String(row.middleName),
        lastName: String(row.lastName),
      }),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))

  const tenantShiftTypes = shiftTypes
    .filter((row) => String(row.organizationId) === organizationId)
    .map((row) => ({ id: String(row.id), name: String(row.name) }))
    .sort((left, right) => left.name.localeCompare(right.name))

  const tenantRosters = rosters.filter((row) => String(row.organizationId) === organizationId)
  const published = selectCurrentPublishedRosters(tenantRosters).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    seriesId: String(row.seriesId ?? row.id),
    versionNumber: Number(row.versionNumber ?? 1),
  }))

  const seriesNames = new Map<string, string>()
  for (const roster of published) {
    seriesNames.set(roster.seriesId, roster.name)
  }

  return {
    timeZone: String(membership.organization.timezone),
    canExport: await reportExportAllowed(membership),
    departments: tenantDepartments,
    professions,
    staff,
    shiftTypes: tenantShiftTypes,
    publishedRosters: published,
    rosterSeries: [...seriesNames.entries()].map(([id, name]) => ({ id, name })),
  }
}

export async function loadReportDataset(input: ReportFilterInput = {}): Promise<ReportDataset> {
  const membership = await requireReportView()
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)
  const parsed = parseReportFilters(input)
  const dates = resolveReportDates({
    dateFrom: parsed.dateFrom,
    dateTo: parsed.dateTo,
    timeZone,
  })
  const filters: ResolvedReportFilters = {
    ...parsed,
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    page: parsed.page ?? 1,
  }

  await assertOwnedFilters(db.orm, organizationId, filters)

  const [
    departmentRows,
    ownedProfessions,
    globalProfessions,
    staffRows,
    shiftTypeRows,
    rosterRows,
    assignmentRows,
    attendanceRows,
    exceptionRows,
    leaveRows,
    requirementRows,
  ] = await Promise.all([
    db.orm.public.Department.where({ organizationId }).all(),
    db.orm.public.Profession.where({ organizationId }).all(),
    db.orm.public.Profession.where({ organizationId: null }).all(),
    db.orm.public.StaffProfile.where({ organizationId }).all(),
    db.orm.public.ShiftType.where({ organizationId }).all(),
    db.orm.public.Roster.where({ organizationId }).all(),
    db.orm.public.ShiftAssignment.where({ organizationId }).all(),
    db.orm.public.AttendanceRecord.where({ organizationId }).all(),
    db.orm.public.AttendanceException.where({ organizationId }).all(),
    db.orm.public.LeaveRequest.where({ organizationId }).all(),
    db.orm.public.StaffingRequirement.where({ organizationId }).all(),
  ])

  const departments = new Map(
    departmentRows
      .filter((row) => String(row.organizationId) === organizationId)
      .map((row) => [String(row.id), String(row.name)]),
  )
  const professions = new Map(
    [...globalProfessions, ...ownedProfessions]
      .filter(
        (row) =>
          row.organizationId == null || String(row.organizationId) === organizationId,
      )
      .map((row) => [String(row.id), String(row.name)]),
  )
  const shiftTypes = new Map(
    shiftTypeRows
      .filter((row) => String(row.organizationId) === organizationId)
      .map((row) => [String(row.id), String(row.name)]),
  )

  const staff = new Map<string, DirectoryStaff>()
  for (const row of staffRows) {
    if (String(row.organizationId) !== organizationId) {
      continue
    }

    const departmentId = String(row.departmentId)
    const professionId = String(row.professionId)
    staff.set(String(row.id), {
      id: String(row.id),
      name: formatStaffName({
        firstName: String(row.firstName),
        middleName: row.middleName == null ? null : String(row.middleName),
        lastName: String(row.lastName),
      }),
      staffNumber: String(row.staffNumber),
      departmentId,
      departmentName: departments.get(departmentId) ?? "Unknown department",
      professionId,
      professionName: professions.get(professionId) ?? "Unknown profession",
      employmentStatus: String(row.employmentStatus),
    })
  }

  const tenantRosters = rosterRows.filter((row) => String(row.organizationId) === organizationId)
  const publishedRosters = (
    filters.rosterId
      ? tenantRosters.filter((row) => String(row.id) === filters.rosterId)
      : selectCurrentPublishedRosters(
          filters.rosterSeriesId
            ? tenantRosters.filter(
                (row) => String(row.seriesId ?? row.id) === filters.rosterSeriesId,
              )
            : tenantRosters,
        )
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    seriesId: String(row.seriesId ?? row.id),
    versionNumber: Number(row.versionNumber ?? 1),
    departmentId: String(row.departmentId),
    startDate: String(row.startDate),
    endDate: String(row.endDate),
    status: String(row.status),
  }))

  const publishedIds = new Set(publishedRosters.map((roster) => roster.id))
  const rosterMode = filters.rosterId ? "historical_version" : "operational"

  const assignments: PlannedAssignment[] = []
  for (const row of assignmentRows) {
    if (String(row.organizationId) !== organizationId) {
      continue
    }

    if (!publishedIds.has(String(row.rosterId))) {
      continue
    }

    const date = String(row.date)
    if (!isDateInInclusiveRange(date, filters.dateFrom, filters.dateTo)) {
      continue
    }

    const assignment: PlannedAssignment = {
      id: String(row.id),
      rosterId: String(row.rosterId),
      staffId: String(row.staffId),
      departmentId: String(row.departmentId),
      professionId: String(row.professionId),
      shiftTypeId: String(row.shiftTypeId),
      date,
      shiftStartTime: String(row.shiftStartTime),
      shiftEndTime: String(row.shiftEndTime),
      isOvernight: Boolean(row.isOvernight),
      scheduledMinutes: assignmentScheduledMinutes({
        startDateTime: row.startDateTime,
        endDateTime: row.endDateTime,
        shiftStartTime: String(row.shiftStartTime),
        shiftEndTime: String(row.shiftEndTime),
        isOvernight: Boolean(row.isOvernight),
      }),
    }

    if (!matchesAssignmentFilters(assignment, filters)) {
      continue
    }

    assignments.push(assignment)
  }

  const exceptionsByRecord = new Map<string, Array<{ type: AttendanceExceptionType; status: string }>>()
  for (const row of exceptionRows) {
    if (String(row.organizationId) !== organizationId) {
      continue
    }

    const recordId = String(row.attendanceRecordId)
    const current = exceptionsByRecord.get(recordId) ?? []
    current.push({ type: asExceptionType(row.type), status: String(row.status) })
    exceptionsByRecord.set(recordId, current)
  }

  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]))
  const allAssignmentShiftTypes = new Map(
    assignmentRows
      .filter((row) => String(row.organizationId) === organizationId)
      .map((row) => [String(row.id), String(row.shiftTypeId)]),
  )

  const attendance: AttendanceFact[] = []
  for (const row of attendanceRows) {
    if (String(row.organizationId) !== organizationId) {
      continue
    }

    const attendanceDate = String(row.attendanceDate)
    if (!isDateInInclusiveRange(attendanceDate, filters.dateFrom, filters.dateTo)) {
      continue
    }

    const staffId = String(row.staffId)
    const profile = staff.get(staffId)
    const departmentId = profile?.departmentId ?? ""
    const assignmentId = row.assignmentId == null ? null : String(row.assignmentId)
    const planned = assignmentId ? assignmentById.get(assignmentId) : undefined
    const status = asAttendanceStatus(row.status)
    const exceptions = exceptionsByRecord.get(String(row.id)) ?? []
    const exceptionTypes = [...new Set(exceptions.map((item) => item.type))]

    const fact: AttendanceFact = {
      id: String(row.id),
      staffId,
      departmentId,
      assignmentId,
      rosterId: row.rosterId == null ? null : String(row.rosterId),
      attendanceDate,
      status,
      scheduledMinutes: row.scheduledMinutes == null ? null : asInteger(row.scheduledMinutes, 0),
      actualMinutes: row.actualMinutes == null ? null : asInteger(row.actualMinutes, 0),
      lateMinutes: asInteger(row.lateMinutes, 0),
      earlyDepartureMinutes: asInteger(row.earlyDepartureMinutes, 0),
      overtimeMinutes: asInteger(row.overtimeMinutes, 0),
      clockIn: row.actualClockInDateTime,
      clockOut: row.actualClockOutDateTime,
      shiftTypeId: planned?.shiftTypeId ?? (assignmentId ? allAssignmentShiftTypes.get(assignmentId) ?? null : null),
      exceptionTypes,
      openExceptionCount: exceptions.filter((item) => item.status === "OPEN").length,
    }

    if (filters.departmentId && fact.departmentId !== filters.departmentId) {
      continue
    }

    if (filters.staffId && fact.staffId !== filters.staffId) {
      continue
    }

    if (filters.professionId && profile?.professionId !== filters.professionId) {
      continue
    }

    if (filters.shiftTypeId && fact.shiftTypeId !== filters.shiftTypeId) {
      continue
    }

    attendance.push(fact)
  }

  const leave: LeaveFact[] = []
  for (const row of leaveRows) {
    if (String(row.organizationId) !== organizationId) {
      continue
    }

    const startDate = String(row.startDate)
    const endDate = String(row.endDate)
    if (!calendarDateRangesOverlap(startDate, endDate, filters.dateFrom, filters.dateTo)) {
      continue
    }

    const staffId = String(row.staffId)
    const profile = staff.get(staffId)
    const fact: LeaveFact = {
      id: String(row.id),
      staffId,
      leaveType: asLeaveType(row.leaveType),
      status: asLeaveStatus(row.status),
      startDate,
      endDate,
      durationDays: clippedInclusiveDays(startDate, endDate, startDate, endDate),
      daysInRange: clippedInclusiveDays(startDate, endDate, filters.dateFrom, filters.dateTo),
    }

    if (filters.departmentId && profile?.departmentId !== filters.departmentId) {
      continue
    }

    if (filters.professionId && profile?.professionId !== filters.professionId) {
      continue
    }

    if (filters.staffId && fact.staffId !== filters.staffId) {
      continue
    }

    if (filters.leaveType && fact.leaveType !== filters.leaveType) {
      continue
    }

    if (filters.leaveStatus && fact.status !== filters.leaveStatus) {
      continue
    }

    leave.push(fact)
  }

  const requirements: RequirementFact[] = requirementRows
    .filter((row) => String(row.organizationId) === organizationId)
    .filter((row) => !filters.departmentId || String(row.departmentId) === filters.departmentId)
    .filter((row) => !filters.professionId || String(row.professionId) === filters.professionId)
    .filter((row) => !filters.shiftTypeId || String(row.shiftTypeId) === filters.shiftTypeId)
    .map((row) => ({
      departmentId: String(row.departmentId),
      shiftTypeId: String(row.shiftTypeId),
      professionId: String(row.professionId),
      requiredCount: asInteger(row.requiredCount, 0),
    }))

  return {
    organizationId,
    period: {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      timeZone,
      rosterMode,
      rosterId: filters.rosterId ?? null,
      rosterSeriesId: filters.rosterSeriesId ?? null,
    },
    filters,
    staff,
    departments,
    professions,
    shiftTypes,
    assignments,
    attendance,
    leave,
    approvedLeave: leave.filter((item) => item.status === "APPROVED"),
    requirements,
    publishedRosters,
  }
}

export function staffOnApprovedLeave(
  approvedLeave: LeaveFact[],
  staffId: string,
  date: string,
) {
  return approvedLeave.some(
    (item) => item.staffId === staffId && item.startDate <= date && item.endDate >= date,
  )
}

export function attendedStaffDates(attendance: AttendanceFact[]) {
  const dates = new Set<string>()
  for (const record of attendance) {
    if (record.status === "VOIDED") {
      continue
    }

    dates.add(`${record.staffId}|${record.attendanceDate}`)
  }

  return dates
}

export function completedStaffDates(attendance: AttendanceFact[]) {
  const dates = new Set<string>()
  for (const record of attendance) {
    if (!isCompletedAttendanceStatus(record.status)) {
      continue
    }

    dates.add(`${record.staffId}|${record.attendanceDate}`)
  }

  return dates
}

export function eligibleAssignments(dataset: ReportDataset) {
  return dataset.assignments.filter(
    (assignment) => !staffOnApprovedLeave(dataset.approvedLeave, assignment.staffId, assignment.date),
  )
}

export function missingAssignments(dataset: ReportDataset) {
  const attended = attendedStaffDates(dataset.attendance)
  return eligibleAssignments(dataset).filter(
    (assignment) => !attended.has(`${assignment.staffId}|${assignment.date}`),
  )
}

export function isWeekendAssignment(date: string) {
  return isWeekendDate(date)
}

export { isCompletedAttendanceStatus }
