import { NextResponse } from "next/server"

import { exportResponseHeaders, isCrossSiteExportRequest } from "@/lib/http/export-request"
import { isReportError } from "@/modules/reports/errors"
import { exportReport } from "@/modules/reports/services/exports"
import { reportFiltersFromSearchParams } from "@/modules/reports/ui/report-query"

function statusFor(code: string) {
  if (code === "UNAUTHENTICATED") {
    return 401
  }

  if (code === "EXPORT_NOT_ALLOWED" || code === "REPORT_UNAUTHORIZED" || code === "FORBIDDEN") {
    return 403
  }

  if (code === "REPORT_TOO_LARGE") {
    return 413
  }

  return 400
}

export async function GET(request: Request) {
  if (isCrossSiteExportRequest(request)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const filters = reportFiltersFromSearchParams(Object.fromEntries(url.searchParams.entries()))
    const result = await exportReport(url.searchParams.get("kind") ?? "", filters)

    return new NextResponse(result.csv, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        ...exportResponseHeaders,
      },
    })
  } catch (error) {
    if (isReportError(error)) {
      return new NextResponse(error.message, { status: statusFor(error.code) })
    }

    throw error
  }
}
