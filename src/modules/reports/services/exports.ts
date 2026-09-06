import { attendanceStatusLabel, formatCoverageStatus, leaveStatusLabel, leaveTypeLabel } from "@/modules/reports/labels"
import { requireReportExport } from "@/modules/reports/services/access"
import { buildAttendanceRows } from "@/modules/reports/services/attendance"
import { buildCsv, CSV_CONTENT_TYPE } from "@/modules/reports/services/csv"
import { loadReportDataset } from "@/modules/reports/services/dataset"
import { buildLeaveRows } from "@/modules/reports/services/leave"
import { buildCoverageRows } from "@/modules/reports/services/staffing"
import { buildStaffWorkloadRows } from "@/modules/reports/services/workload"
import { reportError } from "@/modules/reports/errors"
import { reportExportKindSchema } from "@/modules/reports/schemas/exports"
import type { ReportExportKind } from "@/modules/reports/schemas/exports"
import { MAX_EXPORT_ROWS } from "@/modules/reports/types/filters"
import type { ReportFilterInput } from "@/modules/reports/types/filters"
import type { CsvExportResult } from "@/modules/reports/types/reports"

function assertExportSize(rowCount: number) {
  if (rowCount > MAX_EXPORT_ROWS) {
    throw reportError("REPORT_TOO_LARGE")
  }
}

function filename(kind: ReportExportKind, dateFrom: string, dateTo: string) {
  return `rostera-${kind}-${dateFrom}-to-${dateTo}.csv`
}

export async function exportReport(
  kind: string,
  input: ReportFilterInput = {},
): Promise<CsvExportResult> {
  await requireReportExport()
  const parsedKind = reportExportKindSchema.safeParse(kind)
  if (!parsedKind.success) {
    throw reportError("INVALID_FILTER")
  }

  const dataset = await loadReportDataset(input)
  const dateFrom = dataset.period.dateFrom
  const dateTo = dataset.period.dateTo

  switch (parsedKind.data) {
    case "attendance": {
      const rows = buildAttendanceRows(dataset)
      assertExportSize(rows.length)
      return {
        filename: filename("attendance", dateFrom, dateTo),
        contentType: CSV_CONTENT_TYPE,
        csv: buildCsv(
          [
            "Date",
            "Staff",
            "Staff number",
            "Department",
            "Scheduled shift",
            "Clock in",
            "Clock out",
            "Scheduled hours",
            "Worked hours",
            "Late minutes",
            "Early departure minutes",
            "Overtime hours",
            "Attendance status",
            "Exceptions",
          ],
          rows.map((row) => [
            row.attendanceDate,
            row.staffName,
            row.staffNumber,
            row.departmentName,
            row.scheduledShift,
            row.clockIn,
            row.clockOut,
            row.scheduledHours,
            row.workedHours,
            row.lateMinutes,
            row.earlyDepartureMinutes,
            row.overtimeHours,
            attendanceStatusLabel(row.status),
            row.exceptions.join("; "),
          ]),
        ),
      }
    }
    case "staffing": {
      const rows = buildCoverageRows(dataset)
      assertExportSize(rows.length)
      return {
        filename: filename("staffing", dateFrom, dateTo),
        contentType: CSV_CONTENT_TYPE,
        csv: buildCsv(
          [
            "Date",
            "Department",
            "Profession",
            "Shift",
            "Required",
            "Assigned",
            "Coverage %",
            "Status",
          ],
          rows.map((row) => [
            row.date,
            row.departmentName,
            row.professionName,
            row.shiftTypeName,
            row.requiredCount,
            row.assignedCount,
            row.coveragePercent,
            formatCoverageStatus(row.status),
          ]),
        ),
      }
    }
    case "leave": {
      const rows = buildLeaveRows(dataset)
      assertExportSize(rows.length)
      return {
        filename: filename("leave", dateFrom, dateTo),
        contentType: CSV_CONTENT_TYPE,
        csv: buildCsv(
          [
            "Staff",
            "Staff number",
            "Department",
            "Leave type",
            "Start",
            "End",
            "Days",
            "Days in period",
            "Status",
          ],
          rows.map((row) => [
            row.staffName,
            row.staffNumber,
            row.departmentName,
            leaveTypeLabel(row.leaveType),
            row.startDate,
            row.endDate,
            row.days,
            row.daysInRange,
            leaveStatusLabel(row.status),
          ]),
        ),
      }
    }
    case "staff": {
      const rows = buildStaffWorkloadRows(dataset)
      assertExportSize(rows.length)
      return {
        filename: filename("staff", dateFrom, dateTo),
        contentType: CSV_CONTENT_TYPE,
        csv: buildCsv(
          [
            "Staff",
            "Staff number",
            "Department",
            "Profession",
            "Scheduled shifts",
            "Scheduled hours",
            "Night shifts",
            "Weekend shifts",
            "Attendance sessions",
            "Worked hours",
            "Late minutes",
            "Early departure minutes",
            "Overtime hours",
            "Leave days",
            "Missing attendance",
            "Open exceptions",
          ],
          rows.map((row) => [
            row.staffName,
            row.staffNumber,
            row.departmentName,
            row.professionName,
            row.scheduledShifts,
            row.scheduledHours,
            row.nightShifts,
            row.weekendShifts,
            row.attendanceSessions,
            row.workedHours,
            row.lateMinutes,
            row.earlyDepartureMinutes,
            row.overtimeHours,
            row.leaveDays,
            row.missingAttendance,
            row.openExceptions,
          ]),
        ),
      }
    }
  }
}
