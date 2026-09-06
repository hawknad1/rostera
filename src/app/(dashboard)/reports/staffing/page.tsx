import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { formatCoverageStatus, formatRate } from "@/modules/reports/labels"
import { loadReportLookups } from "@/modules/reports/services/dataset"
import { readReport } from "@/modules/reports/services/read"
import { listStaffingReport } from "@/modules/reports/services/staffing"
import { ReportExportLink } from "@/modules/reports/ui/report-export-link"
import { ReportFilters } from "@/modules/reports/ui/report-filters"
import { ReportLoadError } from "@/modules/reports/ui/report-load-error"
import { ReportPagination } from "@/modules/reports/ui/report-pagination"
import { reportFiltersFromSearchParams } from "@/modules/reports/ui/report-query"

export default async function StaffingReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission(permissions.reportsView)
  const params = await searchParams
  const filters = reportFiltersFromSearchParams(params)
  const lookups = await loadReportLookups()
  const result = await readReport(() => listStaffingReport(filters))

  if (result.error || !result.data) {
    return (
      <ReportLoadError
        action="/reports/staffing"
        filters={filters}
        lookups={lookups}
        message={result.error ?? "Unable to generate this report."}
        show={{ staff: false, roster: true }}
        title="Staffing report"
      />
    )
  }

  const page = result.data
  const formFilters = { ...filters, dateFrom: page.dateFrom, dateTo: page.dateTo }

  return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Staffing report</h1>
            <p className="text-sm text-muted-foreground">
              Planned assignments against staffing requirements. Coverage is not inferred from
              assignment counts alone.
            </p>
          </div>
          <ReportExportLink enabled={lookups.canExport} filters={formFilters} kind="staffing" />
        </div>
        <ReportFilters
          action="/reports/staffing"
          filters={formFilters}
          lookups={lookups}
          show={{ staff: false, roster: true }}
        />
        {page.total === 0 ? (
          <p className="text-sm text-muted-foreground">No staffing requirements or assignments for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Department</th>
                  <th className="py-2 pr-4 font-medium">Profession</th>
                  <th className="py-2 pr-4 font-medium">Shift</th>
                  <th className="py-2 pr-4 font-medium">Required</th>
                  <th className="py-2 pr-4 font-medium">Assigned</th>
                  <th className="py-2 pr-4 font-medium">Coverage</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((row) => (
                  <tr className="border-b border-border" key={`${row.date}-${row.departmentId}-${row.shiftTypeName}-${row.professionName}`}>
                    <td className="py-3 pr-4 whitespace-nowrap">{row.date}</td>
                    <td className="py-3 pr-4">{row.departmentName}</td>
                    <td className="py-3 pr-4">{row.professionName}</td>
                    <td className="py-3 pr-4">{row.shiftTypeName}</td>
                    <td className="py-3 pr-4">{row.requiredCount}</td>
                    <td className="py-3 pr-4">{row.assignedCount}</td>
                    <td className="py-3 pr-4">{formatRate(row.coveragePercent, "No requirement")}</td>
                    <td className="py-3">{formatCoverageStatus(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ReportPagination filters={formFilters} page={page} path="/reports/staffing" />
      </main>
    )
}
