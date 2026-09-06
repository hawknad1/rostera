import { Temporal } from "temporal-polyfill"

import { formatStaffName } from "@/modules/staff/labels"
import type {
  AttendanceEventView,
  AttendanceExceptionView,
  AttendanceRecordView,
  AttendanceReviewStatus,
  AttendanceSource,
  AttendanceStatus,
  AttendanceExceptionSeverity,
  AttendanceExceptionStatus,
  AttendanceExceptionType,
  AttendanceEventType,
} from "@/modules/attendance/types/attendance"
import type { PublicOrm } from "@/modules/attendance/types/orm"
import { asInstant, formatInstantTime, instantToIso } from "@/modules/attendance/services/time"

type StaffRow = {
  id: unknown
  organizationId: unknown
  firstName: unknown
  middleName?: unknown
  lastName: unknown
  staffNumber: unknown
  departmentId: unknown
}

function asStatus(value: unknown): AttendanceStatus {
  if (
    value === "OPEN" ||
    value === "COMPLETED" ||
    value === "MISSED" ||
    value === "EXCEPTION" ||
    value === "CORRECTED" ||
    value === "VOIDED"
  ) {
    return value
  }

  return "OPEN"
}

function asReviewStatus(value: unknown): AttendanceReviewStatus {
  if (value === "UNREVIEWED" || value === "APPROVED" || value === "REJECTED") {
    return value
  }

  return "UNREVIEWED"
}

function asSource(value: unknown): AttendanceSource {
  if (value === "STAFF_PWA" || value === "ADMIN" || value === "SYSTEM" || value === "DEVICE") {
    return value
  }

  return "SYSTEM"
}

function asEventType(value: unknown): AttendanceEventType {
  if (
    value === "CLOCK_IN" ||
    value === "CLOCK_OUT" ||
    value === "MANUAL_CLOCK_IN" ||
    value === "MANUAL_CLOCK_OUT" ||
    value === "CORRECTION" ||
    value === "VOID"
  ) {
    return value
  }

  return "CORRECTION"
}

function asExceptionType(value: unknown): AttendanceExceptionType {
  if (
    value === "LATE_ARRIVAL" ||
    value === "EARLY_DEPARTURE" ||
    value === "MISSED_CLOCK_IN" ||
    value === "MISSED_CLOCK_OUT" ||
    value === "UNSCHEDULED_ATTENDANCE" ||
    value === "OVERTIME" ||
    value === "OUTSIDE_SCHEDULE"
  ) {
    return value
  }

  return "OUTSIDE_SCHEDULE"
}

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string" || raw.length === 0) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return null
  }

  return null
}

function asInteger(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value
  }

  return fallback
}

export async function loadStaffDirectory(orm: PublicOrm, organizationId: string) {
  const [staffRows, departmentRows] = await Promise.all([
    orm.public.StaffProfile.where({ organizationId }).all(),
    orm.public.Department.where({ organizationId }).all(),
  ])

  const departments = new Map(
    departmentRows
      .filter((row) => String(row.organizationId) === organizationId)
      .map((row) => [String(row.id), String(row.name)]),
  )

  const staff = new Map<
    string,
    {
      id: string
      name: string
      staffNumber: string
      departmentId: string
      departmentName: string
    }
  >()

  for (const row of staffRows as StaffRow[]) {
    if (String(row.organizationId) !== organizationId) {
      continue
    }

    const departmentId = String(row.departmentId)
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
    })
  }

  return { staff, departments }
}

export function toExceptionView(row: {
  id: unknown
  type?: unknown
  severity?: unknown
  status?: unknown
  detectedAt?: unknown
  resolvedAt?: unknown
  notes?: unknown
}): AttendanceExceptionView {
  return {
    id: String(row.id),
    type: asExceptionType(row.type),
    severity:
      row.severity === "INFO" || row.severity === "WARNING"
        ? (row.severity as AttendanceExceptionSeverity)
        : "WARNING",
    status:
      row.status === "OPEN" ||
      row.status === "ACKNOWLEDGED" ||
      row.status === "RESOLVED" ||
      row.status === "WAIVED"
        ? (row.status as AttendanceExceptionStatus)
        : "OPEN",
    detectedAt: instantToIso(row.detectedAt) ?? String(row.detectedAt ?? ""),
    resolvedAt: instantToIso(row.resolvedAt),
    notes: row.notes == null ? null : String(row.notes),
  }
}

export function toEventView(row: {
  id: unknown
  type?: unknown
  occurredAt?: unknown
  source?: unknown
  actorUserId?: unknown
  metadata?: unknown
  createdAt?: unknown
}): AttendanceEventView {
  return {
    id: String(row.id),
    type: asEventType(row.type),
    occurredAt: instantToIso(row.occurredAt) ?? String(row.occurredAt ?? ""),
    source: asSource(row.source),
    actorUserId: row.actorUserId == null ? null : String(row.actorUserId),
    metadata: parseMetadata(row.metadata),
    createdAt: instantToIso(row.createdAt) ?? String(row.createdAt ?? ""),
  }
}

export function toRecordView(input: {
  row: Record<string, unknown>
  staffName: string
  staffNumber: string
  departmentId: string
  departmentName: string
  shiftTypeName: string | null
  timeZone: string
  exceptions: AttendanceExceptionView[]
}): AttendanceRecordView {
  const { row, timeZone } = input
  const scheduledStart = asInstant(row.scheduledStartDateTime)
  const scheduledEnd = asInstant(row.scheduledEndDateTime)

  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    staffId: String(row.staffId),
    staffName: input.staffName,
    staffNumber: input.staffNumber,
    departmentId: input.departmentId,
    departmentName: input.departmentName,
    rosterId: row.rosterId == null ? null : String(row.rosterId),
    assignmentId: row.assignmentId == null ? null : String(row.assignmentId),
    attendanceDate: String(row.attendanceDate),
    scheduledStartDateTime: instantToIso(row.scheduledStartDateTime),
    scheduledEndDateTime: instantToIso(row.scheduledEndDateTime),
    scheduledStartTime: formatInstantTime(scheduledStart, timeZone),
    scheduledEndTime: formatInstantTime(scheduledEnd, timeZone),
    isOvernight: Boolean(
      scheduledStart &&
        scheduledEnd &&
        scheduledStart.toZonedDateTimeISO(timeZone).toPlainDate().toString() !==
          scheduledEnd.toZonedDateTimeISO(timeZone).toPlainDate().toString(),
    ),
    shiftTypeName: input.shiftTypeName,
    actualClockInDateTime: instantToIso(row.actualClockInDateTime),
    actualClockOutDateTime: instantToIso(row.actualClockOutDateTime),
    scheduledMinutes: row.scheduledMinutes == null ? null : asInteger(row.scheduledMinutes, 0),
    actualMinutes: row.actualMinutes == null ? null : asInteger(row.actualMinutes, 0),
    lateMinutes: asInteger(row.lateMinutes, 0),
    earlyDepartureMinutes: asInteger(row.earlyDepartureMinutes, 0),
    overtimeMinutes: asInteger(row.overtimeMinutes, 0),
    status: asStatus(row.status),
    reviewStatus: asReviewStatus(row.reviewStatus),
    source: asSource(row.source),
    notes: row.notes == null ? null : String(row.notes),
    approvedByUserId: row.approvedByUserId == null ? null : String(row.approvedByUserId),
    approvedAt: instantToIso(row.approvedAt),
    createdAt: instantToIso(row.createdAt) ?? "",
    updatedAt: instantToIso(row.updatedAt) ?? "",
    exceptions: input.exceptions,
  }
}

export async function shiftTypeNames(orm: PublicOrm, organizationId: string) {
  const rows = await orm.public.ShiftType.where({ organizationId }).all()
  return new Map(
    rows
      .filter((row) => String(row.organizationId) === organizationId)
      .map((row) => [String(row.id), String(row.name)]),
  )
}

export async function assignmentShiftTypeIds(
  orm: PublicOrm,
  organizationId: string,
  assignmentIds: string[],
) {
  if (assignmentIds.length === 0) {
    return new Map<string, string>()
  }

  const rows = await orm.public.ShiftAssignment.where({ organizationId }).all()
  const allowed = new Set(assignmentIds)
  const map = new Map<string, string>()

  for (const row of rows) {
    if (
      String(row.organizationId) === organizationId &&
      allowed.has(String(row.id))
    ) {
      map.set(String(row.id), String(row.shiftTypeId))
    }
  }

  return map
}

export function snapshotFields(calculation: {
  scheduledMinutes: number | null
  actualMinutes: number | null
  lateMinutes: number
  earlyDepartureMinutes: number
  overtimeMinutes: number
}) {
  return {
    scheduledMinutes: calculation.scheduledMinutes,
    actualMinutes: calculation.actualMinutes,
    lateMinutes: calculation.lateMinutes,
    earlyDepartureMinutes: calculation.earlyDepartureMinutes,
    overtimeMinutes: calculation.overtimeMinutes,
  }
}

export { Temporal }
