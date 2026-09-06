import { ReportFilters } from "@/modules/reports/ui/report-filters"
import type { ReportFilterInput } from "@/modules/reports/types/filters"
import type { ReportLookups } from "@/modules/reports/types/reports"

export function ReportLoadError({
  title,
  message,
  action,
  filters,
  lookups,
  show,
}: {
  title: string
  message: string
  action: string
  filters: ReportFilterInput
  lookups: ReportLookups
  show?: Parameters<typeof ReportFilters>[0]["show"]
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <ReportFilters action={action} filters={filters} lookups={lookups} show={show} />
    </main>
  )
}
