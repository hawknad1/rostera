import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { leaveStatusLabel, leaveTypeLabel } from "@/modules/reports/labels"
import { loadReportLookups } from "@/modules/reports/services/dataset"
import { listLeaveReport } from "@/modules/reports/services/leave"
import { readReport } from "@/modules/reports/services/read"
import { MetricList } from "@/modules/reports/ui/metric-list"
import { ReportExportLink } from "@/modules/reports/ui/report-export-link"
import { ReportFilters } from "@/modules/reports/ui/report-filters"
import { ReportLoadError } from "@/modules/reports/ui/report-load-error"
import { ReportPagination } from "@/modules/reports/ui/report-pagination"
import { reportFiltersFromSearchParams } from "@/modules/reports/ui/report-query"

export default async function LeaveReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission(permissions.reportsView)
  const params = await searchParams
  const filters = reportFiltersFromSearchParams(params)
  const lookups = await loadReportLookups()
  const result = await readReport(() => listLeaveReport(filters))

  if (result.error || !result.data) {
    return (
      <ReportLoadError
        action="/reports/leave"
        filters={filters}
        lookups={lookups}
        message={result.error ?? "Unable to generate this report."}
        show={{ shiftType: false, leaveType: true, leaveStatus: true }}
        title="Leave report"
      />
    )
  }

  const { page, summary } = result.data
  const formFilters = { ...filters, dateFrom: page.dateFrom, dateTo: page.dateTo }

  return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Leave report</h1>
            <p className="text-sm text-muted-foreground">
              Operational leave requests. Days use inclusive calendar dates. This is not a statutory
              entitlement report.
            </p>
          </div>
          <ReportExportLink enabled={lookups.canExport} filters={formFilters} kind="leave" />
        </div>
        <ReportFilters
          action="/reports/leave"
          filters={formFilters}
          lookups={lookups}
          show={{ shiftType: false, leaveType: true, leaveStatus: true }}
        />
        <MetricList
          items={[
            { label: "Pending", value: String(summary.pending) },
            { label: "Approved", value: String(summary.approved) },
            { label: "Rejected", value: String(summary.rejected) },
            { label: "Cancelled", value: String(summary.cancelled) },
            { label: "Approved leave days in period", value: String(summary.approvedLeaveDays) },
          ]}
        />
        {page.total === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests overlap this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Staff</th>
                  <th className="py-2 pr-4 font-medium">Department</th>
                  <th className="py-2 pr-4 font-medium">Leave type</th>
                  <th className="py-2 pr-4 font-medium">Start</th>
                  <th className="py-2 pr-4 font-medium">End</th>
                  <th className="py-2 pr-4 font-medium">Days</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((row) => (
                  <tr className="border-b border-border" key={row.id}>
                    <td className="py-3 pr-4">
                      <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        href={`/leave/${row.id}`}
                      >
                        {row.staffName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{row.departmentName}</td>
                    <td className="py-3 pr-4">{leaveTypeLabel(row.leaveType)}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{row.startDate}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{row.endDate}</td>
                    <td className="py-3 pr-4">{row.days}</td>
                    <td className="py-3">{leaveStatusLabel(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ReportPagination filters={formFilters} page={page} path="/reports/leave" />
      </main>
    )
}
