import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { formatHours } from "@/modules/reports/labels"
import { loadReportLookups } from "@/modules/reports/services/dataset"
import { readReport } from "@/modules/reports/services/read"
import { listStaffWorkloadReport } from "@/modules/reports/services/workload"
import { ReportExportLink } from "@/modules/reports/ui/report-export-link"
import { ReportFilters } from "@/modules/reports/ui/report-filters"
import { ReportLoadError } from "@/modules/reports/ui/report-load-error"
import { ReportPagination } from "@/modules/reports/ui/report-pagination"
import { reportFiltersFromSearchParams } from "@/modules/reports/ui/report-query"

export default async function StaffReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission(permissions.reportsView)
  const params = await searchParams
  const filters = reportFiltersFromSearchParams(params)
  const lookups = await loadReportLookups()
  const result = await readReport(() => listStaffWorkloadReport(filters))

  if (result.error || !result.data) {
    return (
      <ReportLoadError
        action="/reports/staff"
        filters={filters}
        lookups={lookups}
        message={result.error ?? "Unable to generate this report."}
        show={{ roster: true }}
        title="Staff report"
      />
    )
  }

  const page = result.data
  const formFilters = { ...filters, dateFrom: page.dateFrom, dateTo: page.dateTo }

  return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Staff report</h1>
            <p className="text-sm text-muted-foreground">
              Scheduled workload compared with attendance and leave. Worked hours come from attendance,
              not from the roster.
            </p>
          </div>
          <ReportExportLink enabled={lookups.canExport} filters={formFilters} kind="staff" />
        </div>
        <ReportFilters action="/reports/staff" filters={formFilters} lookups={lookups} show={{ roster: true }} />
        {page.total === 0 ? (
          <p className="text-sm text-muted-foreground">No staff match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Staff</th>
                  <th className="py-2 pr-4 font-medium">Staff number</th>
                  <th className="py-2 pr-4 font-medium">Department</th>
                  <th className="py-2 pr-4 font-medium">Profession</th>
                  <th className="py-2 pr-4 font-medium">Scheduled shifts</th>
                  <th className="py-2 pr-4 font-medium">Scheduled hours</th>
                  <th className="py-2 pr-4 font-medium">Attendance sessions</th>
                  <th className="py-2 pr-4 font-medium">Worked hours</th>
                  <th className="py-2 pr-4 font-medium">Late minutes</th>
                  <th className="py-2 pr-4 font-medium">Early departure</th>
                  <th className="py-2 pr-4 font-medium">Overtime</th>
                  <th className="py-2 pr-4 font-medium">Leave days</th>
                  <th className="py-2 pr-4 font-medium">Missing attendance</th>
                  <th className="py-2 font-medium">Exceptions</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((row) => (
                  <tr className="border-b border-border" key={row.staffId}>
                    <td className="py-3 pr-4">
                      <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        href={`/staff/${row.staffId}`}
                      >
                        {row.staffName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{row.staffNumber}</td>
                    <td className="py-3 pr-4">{row.departmentName}</td>
                    <td className="py-3 pr-4">{row.professionName}</td>
                    <td className="py-3 pr-4">{row.scheduledShifts}</td>
                    <td className="py-3 pr-4">{formatHours(row.scheduledHours)}</td>
                    <td className="py-3 pr-4">{row.attendanceSessions}</td>
                    <td className="py-3 pr-4">{formatHours(row.workedHours)}</td>
                    <td className="py-3 pr-4">{row.lateMinutes}</td>
                    <td className="py-3 pr-4">{row.earlyDepartureMinutes}</td>
                    <td className="py-3 pr-4">{formatHours(row.overtimeHours)}</td>
                    <td className="py-3 pr-4">{row.leaveDays}</td>
                    <td className="py-3 pr-4">{row.missingAttendance}</td>
                    <td className="py-3">{row.openExceptions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ReportPagination filters={formFilters} page={page} path="/reports/staff" />
      </main>
    )
}
