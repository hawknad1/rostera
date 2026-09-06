import {
  isWeekendAssignment,
  loadReportDataset,
  missingAssignments,
  type ReportDataset,
} from "@/modules/reports/services/dataset"
import {
  isCompletedAttendanceStatus,
  minutesToHours,
  paginateItems,
  workedMinutesFromRecord,
} from "@/modules/reports/services/metrics"
import { REPORT_PAGE_SIZE } from "@/modules/reports/types/filters"
import type { ReportFilterInput } from "@/modules/reports/types/filters"
import type { ReportPage, StaffWorkloadRow } from "@/modules/reports/types/reports"

export function buildStaffWorkloadRows(dataset: ReportDataset): StaffWorkloadRow[] {
  const missing = missingAssignments(dataset)
  const staffIds = new Set<string>([
    ...dataset.staff.keys(),
    ...dataset.assignments.map((item) => item.staffId),
    ...dataset.attendance.map((item) => item.staffId),
    ...dataset.leave.map((item) => item.staffId),
  ])

  const rows: StaffWorkloadRow[] = []

  for (const staffId of staffIds) {
    const profile = dataset.staff.get(staffId)
    if (!profile) {
      continue
    }

    if (dataset.filters.departmentId && profile.departmentId !== dataset.filters.departmentId) {
      continue
    }

    if (dataset.filters.professionId && profile.professionId !== dataset.filters.professionId) {
      continue
    }

    if (dataset.filters.staffId && profile.id !== dataset.filters.staffId) {
      continue
    }

    const assignments = dataset.assignments.filter((item) => item.staffId === staffId)
    const attendance = dataset.attendance.filter((item) => item.staffId === staffId)
    const completed = attendance.filter((item) => isCompletedAttendanceStatus(item.status))
    const leaveDays = dataset.approvedLeave
      .filter((item) => item.staffId === staffId)
      .reduce((sum, item) => sum + item.daysInRange, 0)
    const scheduledMinutes = assignments.reduce((sum, item) => sum + item.scheduledMinutes, 0)
    const workedMinutes = attendance.reduce(
      (sum, item) => sum + workedMinutesFromRecord(item),
      0,
    )
    const overtimeMinutes = completed.reduce((sum, item) => sum + item.overtimeMinutes, 0)

    if (
      assignments.length === 0 &&
      attendance.length === 0 &&
      leaveDays === 0 &&
      profile.employmentStatus !== "ACTIVE"
    ) {
      continue
    }

    rows.push({
      staffId,
      staffName: profile.name,
      staffNumber: profile.staffNumber,
      departmentId: profile.departmentId,
      departmentName: profile.departmentName,
      professionName: profile.professionName,
      scheduledShifts: assignments.length,
      scheduledHours: minutesToHours(scheduledMinutes),
      nightShifts: assignments.filter((item) => item.isOvernight).length,
      weekendShifts: assignments.filter((item) => isWeekendAssignment(item.date)).length,
      attendanceSessions: attendance.filter((item) => item.status !== "VOIDED").length,
      workedHours: minutesToHours(workedMinutes),
      lateMinutes: completed.reduce((sum, item) => sum + item.lateMinutes, 0),
      earlyDepartureMinutes: completed.reduce(
        (sum, item) => sum + item.earlyDepartureMinutes,
        0,
      ),
      overtimeHours: minutesToHours(overtimeMinutes),
      leaveDays,
      missingAttendance: missing.filter((item) => item.staffId === staffId).length,
      openExceptions: attendance.reduce((sum, item) => sum + item.openExceptionCount, 0),
    })
  }

  return rows.sort((left, right) => left.staffName.localeCompare(right.staffName))
}

export async function listStaffWorkloadReport(
  input: ReportFilterInput = {},
): Promise<ReportPage<StaffWorkloadRow>> {
  const dataset = await loadReportDataset(input)
  return {
    ...paginateItems(buildStaffWorkloadRows(dataset), dataset.filters.page, REPORT_PAGE_SIZE),
    dateFrom: dataset.period.dateFrom,
    dateTo: dataset.period.dateTo,
  }
}

export async function staffWorkloadRows(input: ReportFilterInput = {}) {
  const dataset = await loadReportDataset(input)
  return buildStaffWorkloadRows(dataset)
}
