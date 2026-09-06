import { NextResponse } from "next/server"

import { hasPermission } from "@/lib/auth/has-permission"
import { requireOrganization } from "@/lib/auth/require-organization"
import { exportResponseHeaders, isCrossSiteExportRequest } from "@/lib/http/export-request"
import { permissions } from "@/lib/permissions/permissions"
import { attendanceListFilterSchema } from "@/modules/attendance/schemas/attendance"
import { listAttendance } from "@/modules/attendance/services/records"
import { formatMinutes } from "@/modules/attendance/services/time"
import { buildCsv, CSV_CONTENT_TYPE } from "@/modules/reports/services/csv"

export async function GET(request: Request) {
  if (isCrossSiteExportRequest(request)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const membership = await requireOrganization()
  const allowed = await hasPermission(membership, permissions.attendanceExport)

  if (!allowed) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const url = new URL(request.url)
  const parsed = attendanceListFilterSchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
    departmentId: url.searchParams.get("departmentId") ?? undefined,
    staffId: url.searchParams.get("staffId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    exceptionType: url.searchParams.get("exceptionType") ?? undefined,
  })
  const rows = await listAttendance(parsed.success ? parsed.data : {})

  const header = [
    "Staff",
    "Department",
    "Date",
    "Scheduled start",
    "Scheduled end",
    "Clock in",
    "Clock out",
    "Actual minutes",
    "Late minutes",
    "Early minutes",
    "Overtime minutes",
    "Status",
  ]
  const body = rows.map((row) => [
    row.staffName,
    row.departmentName,
    row.attendanceDate,
    row.scheduledStartTime ?? "",
    row.scheduledEndTime ?? "",
    row.actualClockInDateTime ?? "",
    row.actualClockOutDateTime ?? "",
    formatMinutes(row.actualMinutes),
    String(row.lateMinutes),
    String(row.earlyDepartureMinutes),
    String(row.overtimeMinutes),
    row.status,
  ])
  const csv = buildCsv(header, body)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": CSV_CONTENT_TYPE,
      "Content-Disposition": 'attachment; filename="attendance.csv"',
      ...exportResponseHeaders,
    },
  })
}
