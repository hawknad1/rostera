import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { formatDateRange } from "@/lib/dates/calendar-date"
import { permissions } from "@/lib/permissions/permissions"
import { formatHours, formatRate } from "@/modules/reports/labels"
import { loadReportLookups } from "@/modules/reports/services/dataset"
import { getOperationsOverview } from "@/modules/reports/services/overview"
import { readReport } from "@/modules/reports/services/read"
import { MetricList } from "@/modules/reports/ui/metric-list"
import { ReportFilters } from "@/modules/reports/ui/report-filters"
import { ReportLoadError } from "@/modules/reports/ui/report-load-error"
import { reportFiltersFromSearchParams } from "@/modules/reports/ui/report-query"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission(permissions.reportsView)
  const params = await searchParams
  const filters = reportFiltersFromSearchParams(params)
  const lookups = await loadReportLookups()
  const result = await readReport(() => getOperationsOverview(filters))

  if (result.error || !result.data) {
    return (
      <ReportLoadError
        action="/reports"
        filters={filters}
        lookups={lookups}
        message={result.error ?? "Unable to generate this report."}
        show={{ staff: false, roster: true }}
        title="Reports"
      />
    )
  }

  const overview = result.data
  const formFilters = {
    ...filters,
    dateFrom: overview.period.dateFrom,
    dateTo: overview.period.dateTo,
  }

  return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Planned roster work, actual attendance, leave, and coverage for{" "}
            {formatDateRange(overview.period.dateFrom, overview.period.dateTo)}. Dates use{" "}
            {overview.period.timeZone}.{" "}
            {overview.period.rosterMode === "operational"
              ? "Scheduled figures use the current published roster version in each series."
              : "Scheduled figures use the selected historical published roster version."}
          </p>
        </div>

        <ReportFilters
          action="/reports"
          filters={formFilters}
          lookups={lookups}
          show={{ staff: false, roster: true }}
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Operations</h2>
          <MetricList
            items={[
              { label: "Active staff", value: String(overview.staff.activeStaff) },
              {
                label: "Staff with published assignments",
                value: String(overview.staff.staffWithPublishedAssignments),
              },
              { label: "Scheduled shifts", value: String(overview.planned.scheduledShifts) },
              { label: "Scheduled hours", value: formatHours(overview.planned.scheduledHours) },
            ]}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Staffing coverage</h2>
          <MetricList
            items={[
              {
                label: "Coverage fill rate",
                value: formatRate(overview.coverage.fillRate.percent, "No requirement"),
              },
              { label: "Under-covered shifts", value: String(overview.coverage.underCovered) },
              { label: "Fully covered shifts", value: String(overview.coverage.fullyCovered) },
              { label: "Over-covered shifts", value: String(overview.coverage.overCovered) },
            ]}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Attendance</h2>
          <MetricList
            items={[
              { label: "Attendance records", value: String(overview.attendance.records) },
              { label: "Worked hours", value: formatHours(overview.attendance.workedHours) },
              { label: "Overtime hours", value: formatHours(overview.attendance.overtimeHours) },
              { label: "Late arrivals", value: String(overview.attendance.lateArrivals) },
              { label: "Early departures", value: String(overview.attendance.earlyDepartures) },
              { label: "Missing attendance", value: String(overview.attendance.missingAttendance) },
              {
                label: "Attendance completion",
                value: formatRate(overview.attendance.completion.percent),
              },
              {
                label: "Punctuality",
                value: formatRate(overview.attendance.punctuality.percent),
              },
            ]}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Leave</h2>
          <MetricList
            items={[
              { label: "Approved leave days", value: String(overview.leave.approvedLeaveDays) },
              { label: "Pending requests", value: String(overview.leave.pendingRequests) },
              { label: "Approved requests", value: String(overview.leave.approvedRequests) },
            ]}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Exceptions</h2>
          <MetricList
            items={[
              {
                label: "Open attendance exceptions",
                value: String(overview.exceptions.openAttendanceExceptions),
              },
              {
                label: "Scheduling blockers",
                value: String(overview.exceptions.schedulingBlockers),
              },
              {
                label: "Scheduling warnings",
                value: String(overview.exceptions.schedulingWarnings),
              },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            Scheduling exceptions are reconstructed from current published rosters using today&apos;s
            policy. They are not a historical record of what was validated at publish time.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Reports</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/reports/staff">
                Staff workload
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-primary underline-offset-4 hover:underline"
                href="/reports/attendance"
              >
                Attendance
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-primary underline-offset-4 hover:underline"
                href="/reports/staffing"
              >
                Staffing coverage
              </Link>
            </li>
            <li>
              <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/reports/leave">
                Leave
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-primary underline-offset-4 hover:underline"
                href="/reports/exceptions"
              >
                Scheduling exceptions
              </Link>
            </li>
          </ul>
        </section>
      </main>
    )
}
