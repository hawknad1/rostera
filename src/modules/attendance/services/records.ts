import { Temporal } from "temporal-polyfill"

import { permissions } from "@/lib/permissions/permissions"
import { attendanceError } from "@/modules/attendance/errors"
import type { AttendanceListFilterInput } from "@/modules/attendance/schemas/attendance"
import {
  isSelfScopedAttendanceView,
  linkedStaffIdForMembership,
  requireAttendanceAccess,
  requireLinkedStaffForSelfView,
} from "@/modules/attendance/services/access"
import { loadExceptionsForRecords } from "@/modules/attendance/services/exceptions"
import {
  assignmentShiftTypeIds,
  loadStaffDirectory,
  shiftTypeNames,
  toEventView,
  toExceptionView,
  toRecordView,
} from "@/modules/attendance/services/map"
import { findMatchingPublishedAssignment } from "@/modules/attendance/services/match"
import { ensureDefaultAttendancePolicy } from "@/modules/attendance/services/policy"
import { asInstant } from "@/modules/attendance/services/time"
import type {
  AttendanceDetailView,
  AttendanceRecordView,
  StaffAttendanceTodayView,
} from "@/modules/attendance/types/attendance"
import { todayInTimeZone } from "@/modules/staff-app/format"
import { db } from "@/prisma/db"

function compareCreatedAt(left: { createdAt?: unknown }, right: { createdAt?: unknown }) {
  return String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""))
}

async function hydrateRecords(
  organizationId: string,
  timeZone: string,
  rows: Array<Record<string, unknown>>,
): Promise<AttendanceRecordView[]> {
  const recordIds = rows.map((row) => String(row.id))
  const assignmentIds = rows
    .map((row) => (row.assignmentId == null ? null : String(row.assignmentId)))
    .filter((id): id is string => Boolean(id))

  const [{ staff }, exceptions, shiftTypes, assignmentTypes] = await Promise.all([
    loadStaffDirectory(db.orm, organizationId),
    loadExceptionsForRecords(db.orm, organizationId, recordIds),
    shiftTypeNames(db.orm, organizationId),
    assignmentShiftTypeIds(db.orm, organizationId, assignmentIds),
  ])

  const exceptionsByRecord = new Map<string, ReturnType<typeof toExceptionView>[]>()
  for (const row of exceptions) {
    const recordId = String(row.attendanceRecordId)
    const list = exceptionsByRecord.get(recordId) ?? []
    list.push(toExceptionView(row))
    exceptionsByRecord.set(recordId, list)
  }

  return rows.map((row) => {
    const profile = staff.get(String(row.staffId))
    const assignmentId = row.assignmentId == null ? null : String(row.assignmentId)
    const shiftTypeId = assignmentId ? assignmentTypes.get(assignmentId) : null

    return toRecordView({
      row,
      staffName: profile?.name ?? "Unknown staff",
      staffNumber: profile?.staffNumber ?? "",
      departmentId: profile?.departmentId ?? "",
      departmentName: profile?.departmentName ?? "Unknown department",
      shiftTypeName: shiftTypeId ? (shiftTypes.get(shiftTypeId) ?? null) : null,
      timeZone,
      exceptions: exceptionsByRecord.get(String(row.id)) ?? [],
    })
  })
}

export async function listAttendance(filters: AttendanceListFilterInput = {}) {
  const membership = await requireAttendanceAccess(permissions.attendanceView)
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)
  const date = filters.date ?? todayInTimeZone(timeZone)
  const selfScoped = await isSelfScopedAttendanceView(membership)
  const ownStaffId = selfScoped ? await linkedStaffIdForMembership(membership) : null

  if (selfScoped && !ownStaffId) {
    return []
  }

  const rows = (
    await db.orm.public.AttendanceRecord.where({
      organizationId,
      attendanceDate: date,
    }).all()
  )
    .filter((row) => String(row.organizationId) === organizationId)
    .filter((row) => !ownStaffId || String(row.staffId) === ownStaffId)
    .sort(compareCreatedAt)

  const hydrated = await hydrateRecords(organizationId, timeZone, rows as Array<Record<string, unknown>>)

  return hydrated.filter((row) => {
    if (filters.departmentId && row.departmentId !== filters.departmentId) {
      return false
    }

    if (filters.staffId && row.staffId !== filters.staffId) {
      return false
    }

    if (filters.status && row.status !== filters.status) {
      return false
    }

    if (
      filters.exceptionType &&
      !row.exceptions.some((exception) => exception.type === filters.exceptionType && exception.status === "OPEN")
    ) {
      return false
    }

    return true
  })
}

export async function getAttendance(id: string): Promise<AttendanceDetailView> {
  const membership = await requireAttendanceAccess(permissions.attendanceView)
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)
  const selfScoped = await isSelfScopedAttendanceView(membership)
  const ownStaffId = selfScoped ? await linkedStaffIdForMembership(membership) : null

  const row = await db.orm.public.AttendanceRecord.where({
    id,
    organizationId,
  }).first()

  if (!row || String(row.organizationId) !== organizationId) {
    throw attendanceError("ATTENDANCE_NOT_FOUND")
  }

  if (ownStaffId && String(row.staffId) !== ownStaffId) {
    throw attendanceError("UNAUTHORIZED_ATTENDANCE_ACCESS")
  }

  const [hydrated] = await hydrateRecords(organizationId, timeZone, [row as Record<string, unknown>])
  const eventRows = (
    await db.orm.public.AttendanceEvent.where({
      organizationId,
      attendanceRecordId: id,
    }).all()
  )
    .filter(
      (event) =>
        String(event.organizationId) === organizationId && String(event.attendanceRecordId) === id,
    )
    .sort((left, right) => String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? "")))

  return {
    ...hydrated,
    events: eventRows.map((event) => toEventView(event)),
  }
}

export async function getStaffAttendanceToday(
  now: Temporal.Instant = Temporal.Now.instant(),
): Promise<StaffAttendanceTodayView> {
  const identity = await requireLinkedStaffForSelfView()
  const organizationId = identity.staff.organizationId
  const timeZone = identity.timeZone
  const policy = await ensureDefaultAttendancePolicy(db.orm, organizationId)
  const open = (
    await db.orm.public.AttendanceRecord.where({
      organizationId,
      staffId: identity.staff.id,
      status: "OPEN",
    }).all()
  ).find(
    (row) =>
      String(row.organizationId) === organizationId &&
      String(row.staffId) === identity.staff.id &&
      String(row.status) === "OPEN",
  )

  const today = todayInTimeZone(timeZone, now)
  const todayRows = (
    await db.orm.public.AttendanceRecord.where({
      organizationId,
      staffId: identity.staff.id,
      attendanceDate: today,
    }).all()
  ).filter(
    (row) =>
      String(row.organizationId) === organizationId &&
      String(row.staffId) === identity.staff.id &&
      String(row.attendanceDate) === today &&
      String(row.status) !== "VOIDED",
  )

  const currentRow =
    open ??
    [...todayRows].sort((left, right) =>
      String(right.updatedAt ?? right.createdAt ?? "").localeCompare(
        String(left.updatedAt ?? left.createdAt ?? ""),
      ),
    )[0]

  const record = currentRow
    ? (await hydrateRecords(organizationId, timeZone, [currentRow as Record<string, unknown>]))[0]
    : null

  const match = await findMatchingPublishedAssignment({
    orm: db.orm,
    organizationId,
    staffId: identity.staff.id,
    now,
    policy,
  })

  let planned: StaffAttendanceTodayView["planned"] = null
  if (match) {
    const types = await shiftTypeNames(db.orm, organizationId)
    const departments = (await loadStaffDirectory(db.orm, organizationId)).departments
    planned = {
      assignmentId: match.id,
      date: match.date,
      shiftTypeName: types.get(match.shiftTypeId) ?? "Shift",
      departmentName: departments.get(match.departmentId) ?? identity.staff.departmentName,
      startTime: match.shiftStartTime,
      endTime: match.shiftEndTime,
      isOvernight: match.isOvernight,
      timeLabel: `${match.shiftStartTime} – ${match.shiftEndTime}`,
    }
  }

  const clockIn = record ? asInstant(record.actualClockInDateTime) : null
  const clockOut = record ? asInstant(record.actualClockOutDateTime) : null
  let status: StaffAttendanceTodayView["status"] = "NOT_CLOCKED_IN"
  if (record?.status === "OPEN" && clockIn) {
    status = "CLOCKED_IN"
  } else if (record && clockOut) {
    status = "CLOCKED_OUT"
  }

  const elapsedMinutes =
    status === "CLOCKED_IN" && clockIn
      ? Math.max(0, Math.floor(Number(now.epochMilliseconds - clockIn.epochMilliseconds) / 60_000))
      : null

  return {
    status,
    record,
    planned,
    elapsedMinutes,
  }
}
