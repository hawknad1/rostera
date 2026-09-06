import Link from "next/link"

import type { ReportFilterInput } from "@/modules/reports/types/filters"
import { reportExportHref } from "@/modules/reports/ui/report-query"

export function ReportExportLink({
  kind,
  filters,
  enabled,
}: {
  kind: "attendance" | "staffing" | "leave" | "staff"
  filters: ReportFilterInput
  enabled: boolean
}) {
  if (!enabled) {
    return null
  }

  return (
    <Link
      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      href={reportExportHref(kind, filters)}
    >
      Export CSV
    </Link>
  )
}
