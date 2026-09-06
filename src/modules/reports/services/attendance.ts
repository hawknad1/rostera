import { attendanceExceptionLabels } from "@/modules/attendance/labels"
import { formatInstantTime } from "@/modules/attendance/services/time"
import { minutesToHours, paginateItems, workedMinutesFromRecord } from "@/modules/reports/services/metrics"
import { loadReportDataset } from "@/modules/reports/services/dataset"
import { REPORT_PAGE_SIZE } from "@/modules/reports/types/filters"
import type { ReportFilterInput } from "@/modules/reports/types/filters"
import type { AttendanceReportRow, ReportPage } from "@/modules/reports/types/reports"

function scheduledShiftLabel(dataset: Awaited<ReturnType<typeof loadReportDataset>>, row: {
  assignmentId: string | null
  shiftTypeId: string | null
}) {
  if (!row.assignmentId) {
    return row.shiftTypeId ? dataset.shiftTypes.get(row.shiftTypeId) ?? "Unscheduled" : "Unscheduled"
  }

  const assignment = dataset.assignments.find((item) => item.id === row.assignmentId)
  if (!assignment) {
    const name = row.shiftTypeId ? dataset.shiftTypes.get(row.shiftTypeId) : null
    return name ?? "Scheduled shift"
  }

  const name = dataset.shiftTypes.get(assignment.shiftTypeId) ?? "Shift"
  return `${name} · ${assignment.shiftStartTime}–${assignment.shiftEndTime}${
    assignment.isOvernight ? " overnight" : ""
  }`
}

export function buildAttendanceRows(
  dataset: Awaited<ReturnType<typeof loadReportDataset>>,
): AttendanceReportRow[] {
  const rows = dataset.attendance
    .filter((record) => {
      if (dataset.filters.attendanceStatus && record.status !== dataset.filters.attendanceStatus) {
        return false
      }

      if (
        dataset.filters.exceptionType &&
        !record.exceptionTypes.includes(dataset.filters.exceptionType)
      ) {
        return false
      }

      return true
    })
    .map((record) => {
      const profile = dataset.staff.get(record.staffId)
      const scheduledHours =
        record.scheduledMinutes == null ? null : minutesToHours(record.scheduledMinutes)
      const worked =
        workedMinutesFromRecord(record) > 0 || record.actualMinutes != null
          ? minutesToHours(workedMinutesFromRecord(record))
          : record.actualMinutes == null
            ? null
            : minutesToHours(record.actualMinutes)

      return {
        id: record.id,
        attendanceDate: record.attendanceDate,
        staffId: record.staffId,
        staffName: profile?.name ?? "Unknown staff",
        staffNumber: profile?.staffNumber ?? "",
        departmentName: profile?.departmentName ?? "Unknown department",
        scheduledShift: scheduledShiftLabel(dataset, record),
        clockIn: formatInstantTime(record.clockIn, dataset.period.timeZone),
        clockOut: formatInstantTime(record.clockOut, dataset.period.timeZone),
        scheduledHours,
        workedHours: isCompleted(record.status) ? worked : record.actualMinutes == null ? null : worked,
        lateMinutes: record.lateMinutes,
        earlyDepartureMinutes: record.earlyDepartureMinutes,
        overtimeHours: minutesToHours(record.overtimeMinutes),
        status: record.status,
        exceptions: record.exceptionTypes.map(
          (type) => attendanceExceptionLabels[type] ?? type,
        ),
      }
    })

  return rows.sort((left, right) => {
    const date = left.attendanceDate.localeCompare(right.attendanceDate)
    if (date !== 0) {
      return date
    }

    return left.staffName.localeCompare(right.staffName)
  })
}

function isCompleted(status: string) {
  return status === "COMPLETED" || status === "EXCEPTION" || status === "CORRECTED"
}

export async function listAttendanceReport(
  input: ReportFilterInput = {},
): Promise<ReportPage<AttendanceReportRow>> {
  const dataset = await loadReportDataset(input)
  return {
    ...paginateItems(buildAttendanceRows(dataset), dataset.filters.page, REPORT_PAGE_SIZE),
    dateFrom: dataset.period.dateFrom,
    dateTo: dataset.period.dateTo,
  }
}

export async function attendanceReportRows(input: ReportFilterInput = {}) {
  const dataset = await loadReportDataset(input)
  return buildAttendanceRows(dataset)
}
