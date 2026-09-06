import { permissions } from "@/lib/permissions/permissions"
import { requireAttendanceAccess } from "@/modules/attendance/services/access"
import { loadStaffDirectory, shiftTypeNames } from "@/modules/attendance/services/map"
import type { MissingAttendanceFilterInput } from "@/modules/attendance/schemas/attendance"
import type { MissingAttendanceRow } from "@/modules/attendance/types/attendance"
import { selectCurrentPublishedRosters } from "@/modules/rosters/services/versions"
import { todayInTimeZone } from "@/modules/staff-app/format"
import { db } from "@/prisma/db"

export async function listMissingAttendance(filters: MissingAttendanceFilterInput = {}) {
  const membership = await requireAttendanceAccess(permissions.attendanceView)
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)
  const date = filters.date ?? todayInTimeZone(timeZone)

  const [rosterRows, assignmentRows, attendanceRows, leaveRows, { staff }, types] = await Promise.all([
    db.orm.public.Roster.where({ organizationId }).all(),
    db.orm.public.ShiftAssignment.where({ organizationId }).all(),
    db.orm.public.AttendanceRecord.where({
      organizationId,
      attendanceDate: date,
    }).all(),
    db.orm.public.LeaveRequest.where({
      organizationId,
      status: "APPROVED",
    }).all(),
    loadStaffDirectory(db.orm, organizationId),
    shiftTypeNames(db.orm, organizationId),
  ])

  const publishedIds = new Set(
    selectCurrentPublishedRosters(
      rosterRows.filter((row) => String(row.organizationId) === organizationId),
    ).map((roster) => String(roster.id)),
  )

  const attendedStaff = new Set(
    attendanceRows
      .filter(
        (row) =>
          String(row.organizationId) === organizationId &&
          String(row.attendanceDate) === date &&
          String(row.status) !== "VOIDED",
      )
      .map((row) => String(row.staffId)),
  )

  const missing: MissingAttendanceRow[] = []

  for (const assignment of assignmentRows) {
    if (
      String(assignment.organizationId) !== organizationId ||
      String(assignment.date) !== date ||
      !publishedIds.has(String(assignment.rosterId))
    ) {
      continue
    }

    if (filters.departmentId && String(assignment.departmentId) !== filters.departmentId) {
      continue
    }

    if (filters.shiftTypeId && String(assignment.shiftTypeId) !== filters.shiftTypeId) {
      continue
    }

    const staffId = String(assignment.staffId)
    if (attendedStaff.has(staffId)) {
      continue
    }

    const onLeave = leaveRows.some(
      (row) =>
        String(row.organizationId) === organizationId &&
        String(row.staffId) === staffId &&
        String(row.status) === "APPROVED" &&
        String(row.startDate) <= date &&
        String(row.endDate) >= date,
    )

    if (onLeave) {
      continue
    }

    const profile = staff.get(staffId)
    missing.push({
      staffId,
      staffName: profile?.name ?? "Unknown staff",
      staffNumber: profile?.staffNumber ?? "",
      departmentId: String(assignment.departmentId),
      departmentName: profile?.departmentName ?? "Unknown department",
      assignmentId: String(assignment.id),
      rosterId: String(assignment.rosterId),
      date,
      shiftTypeName: types.get(String(assignment.shiftTypeId)) ?? "Shift",
      startTime: String(assignment.shiftStartTime),
      endTime: String(assignment.shiftEndTime),
      isOvernight: Boolean(assignment.isOvernight),
    })
  }

  return missing.sort((left, right) => left.staffName.localeCompare(right.staffName))
}
