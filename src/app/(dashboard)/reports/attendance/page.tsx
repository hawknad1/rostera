import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { attendanceStatusLabel, formatHours } from "@/modules/reports/labels"
import { listAttendanceReport } from "@/modules/reports/services/attendance"
import { loadReportLookups } from "@/modules/reports/services/dataset"
import { readReport } from "@/modules/reports/services/read"
import { ReportExportLink } from "@/modules/reports/ui/report-export-link"
import { ReportFilters } from "@/modules/reports/ui/report-filters"
import { ReportLoadError } from "@/modules/reports/ui/report-load-error"
import { ReportPagination } from "@/modules/reports/ui/report-pagination"
import { reportFiltersFromSearchParams } from "@/modules/reports/ui/report-query"

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission(permissions.reportsView)
  const params = await searchParams
  const filters = reportFiltersFromSearchParams(params)
  const lookups = await loadReportLookups()
  const result = await readReport(() => listAttendanceReport(filters))

  if (result.error || !result.data) {
    return (
      <ReportLoadError
        action="/reports/attendance"
        filters={filters}
        lookups={lookups}
        message={result.error ?? "Unable to generate this report."}
        show={{ attendanceStatus: true, exceptionType: true }}
        title="Attendance report"
      />
    )
  }

  const page = result.data
  const formFilters = { ...filters, dateFrom: page.dateFrom, dateTo: page.dateTo }

  return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Attendance report</h1>
            <p className="text-sm text-muted-foreground">
              Actual clock times and snapshot minutes. Missing attendance is not filled with scheduled
              hours.
            </p>
          </div>
          <ReportExportLink enabled={lookups.canExport} filters={formFilters} kind="attendance" />
        </div>
        <ReportFilters
          action="/reports/attendance"
          filters={formFilters}
          lookups={lookups}
          show={{ attendanceStatus: true, exceptionType: true }}
        />
        {page.total === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Staff</th>
                  <th className="py-2 pr-4 font-medium">Department</th>
                  <th className="py-2 pr-4 font-medium">Scheduled shift</th>
                  <th className="py-2 pr-4 font-medium">Clock in</th>
                  <th className="py-2 pr-4 font-medium">Clock out</th>
                  <th className="py-2 pr-4 font-medium">Scheduled hours</th>
                  <th className="py-2 pr-4 font-medium">Worked hours</th>
                  <th className="py-2 pr-4 font-medium">Late</th>
                  <th className="py-2 pr-4 font-medium">Early</th>
                  <th className="py-2 pr-4 font-medium">Overtime</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Exceptions</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((row) => (
                  <tr className="border-b border-border" key={row.id}>
                    <td className="py-3 pr-4 whitespace-nowrap">{row.attendanceDate}</td>
                    <td className="py-3 pr-4">
                      <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        href={`/attendance/${row.id}`}
                      >
                        {row.staffName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{row.departmentName}</td>
                    <td className="py-3 pr-4">{row.scheduledShift ?? "—"}</td>
                    <td className="py-3 pr-4">{row.clockIn ?? "—"}</td>
                    <td className="py-3 pr-4">{row.clockOut ?? "—"}</td>
                    <td className="py-3 pr-4">{formatHours(row.scheduledHours)}</td>
                    <td className="py-3 pr-4">{formatHours(row.workedHours)}</td>
                    <td className="py-3 pr-4">{row.lateMinutes}</td>
                    <td className="py-3 pr-4">{row.earlyDepartureMinutes}</td>
                    <td className="py-3 pr-4">{formatHours(row.overtimeHours)}</td>
                    <td className="py-3 pr-4">{attendanceStatusLabel(row.status)}</td>
                    <td className="py-3">{row.exceptions.length > 0 ? row.exceptions.join(", ") : "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ReportPagination filters={formFilters} page={page} path="/reports/attendance" />
      </main>
    )
}
