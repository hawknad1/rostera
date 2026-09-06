import Link from "next/link"

import type { ReportFilterInput } from "@/modules/reports/types/filters"
import type { ReportPage } from "@/modules/reports/types/reports"
import { reportHref } from "@/modules/reports/ui/report-query"

export function ReportPagination<T>({
  path,
  filters,
  page,
}: {
  path: string
  filters: ReportFilterInput
  page: ReportPage<T>
}) {
  if (page.total === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Page {page.page} · {page.total} {page.total === 1 ? "row" : "rows"}
      </p>
      <div className="flex items-center gap-4">
        {page.hasPrevious ? (
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href={reportHref(path, filters, page.page - 1)}
          >
            Previous
          </Link>
        ) : (
          <span className="text-muted-foreground">Previous</span>
        )}
        {page.hasNext ? (
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href={reportHref(path, filters, page.page + 1)}
          >
            Next
          </Link>
        ) : (
          <span className="text-muted-foreground">Next</span>
        )}
      </div>
    </div>
  )
}
