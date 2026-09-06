import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { schedulingConflictLabels, schedulingExceptionBandLabels } from "@/modules/reports/labels"
import { loadReportLookups } from "@/modules/reports/services/dataset"
import { listExceptionReport } from "@/modules/reports/services/exceptions"
import { readReport } from "@/modules/reports/services/read"
import type { SchedulingConflictCode } from "@/modules/scheduling/types/scheduling-conflict"
import { ReportFilters } from "@/modules/reports/ui/report-filters"
import { ReportLoadError } from "@/modules/reports/ui/report-load-error"
import { ReportPagination } from "@/modules/reports/ui/report-pagination"
import { reportFiltersFromSearchParams } from "@/modules/reports/ui/report-query"

export default async function ExceptionsReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission(permissions.reportsView)
  const params = await searchParams
  const filters = reportFiltersFromSearchParams(params)
  const lookups = await loadReportLookups()
  const result = await readReport(() => listExceptionReport(filters))

  if (result.error || !result.data) {
    return (
      <ReportLoadError
        action="/reports/exceptions"
        filters={filters}
        lookups={lookups}
        message={result.error ?? "Unable to generate this report."}
        show={{ roster: true, schedulingSeverity: true }}
        title="Scheduling exceptions"
      />
    )
  }

  const page = result.data
  const formFilters = { ...filters, dateFrom: page.dateFrom, dateTo: page.dateTo }

  return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Scheduling exceptions</h1>
          <p className="text-sm text-muted-foreground">
            Reconstructed from current published rosters using today&apos;s scheduling policy. Rostera
            does not persist historical validation results, so this is not what the policy said at
            publish time.
          </p>
        </div>
        <ReportFilters
          action="/reports/exceptions"
          filters={formFilters}
          lookups={lookups}
          show={{ roster: true, schedulingSeverity: true }}
        />
        {page.total === 0 ? (
          <p className="text-sm text-muted-foreground">No reconstructed scheduling exceptions for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Severity</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Staff</th>
                  <th className="py-2 pr-4 font-medium">Roster</th>
                  <th className="py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((row, index) => (
                  <tr className="border-b border-border" key={`${row.rosterId}-${row.code}-${row.date}-${index}`}>
                    <td className="py-3 pr-4">{schedulingExceptionBandLabels[row.band]}</td>
                    <td className="py-3 pr-4">
                      {schedulingConflictLabels[row.code as SchedulingConflictCode] ?? row.code}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">{row.date ?? "—"}</td>
                    <td className="py-3 pr-4">{row.staffName ?? "—"}</td>
                    <td className="py-3 pr-4">
                      {row.rosterId ? (
                        <Link
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          href={`/rosters/${row.rosterId}`}
                        >
                          {row.rosterName ?? "Roster"}
                        </Link>
                      ) : (
                        row.rosterName ?? "—"
                      )}
                    </td>
                    <td className="py-3">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ReportPagination filters={formFilters} page={page} path="/reports/exceptions" />
      </main>
    )
}
