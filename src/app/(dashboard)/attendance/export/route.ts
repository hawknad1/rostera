import { NextResponse } from "next/server"

import { hasPermission } from "@/lib/auth/has-permission"
import { requireOrganization } from "@/lib/auth/require-organization"
import { permissions } from "@/lib/permissions/permissions"
import { attendanceListFilterSchema } from "@/modules/attendance/schemas/attendance"
import { listAttendance } from "@/modules/attendance/services/records"
import { formatMinutes } from "@/modules/attendance/services/time"

export async function GET(request: Request) {
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
  const body = rows.map((row) =>
    [
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
    ]
      .map((value) => `"${value.replaceAll('"', '""')}"`)
      .join(","),
  )
  const csv = [header.join(","), ...body].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="attendance.csv"',
    },
  })
}
