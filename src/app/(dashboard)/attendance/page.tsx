import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { attendanceListFilterSchema } from "@/modules/attendance/schemas/attendance"
import { getAttendanceCapabilities } from "@/modules/attendance/services/capabilities"
import { loadStaffDirectory } from "@/modules/attendance/services/map"
import { listAttendance } from "@/modules/attendance/services/records"
import { AttendanceFilters } from "@/modules/attendance/ui/attendance-filters"
import { AttendanceTable } from "@/modules/attendance/ui/attendance-table"
import { todayInTimeZone } from "@/modules/staff-app/format"
import { db } from "@/prisma/db"

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission(permissions.attendanceView)
  const params = await searchParams
  const parsed = attendanceListFilterSchema.safeParse({
    date: typeof params.date === "string" ? params.date : undefined,
    departmentId: typeof params.departmentId === "string" ? params.departmentId : undefined,
    staffId: typeof params.staffId === "string" ? params.staffId : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    exceptionType: typeof params.exceptionType === "string" ? params.exceptionType : undefined,
  })
  const filters = parsed.success ? parsed.data : {}
  const [rows, capabilities] = await Promise.all([
    listAttendance(filters),
    getAttendanceCapabilities(),
  ])
  const date = filters.date ?? todayInTimeZone(capabilities.timeZone)
  const { staff, departments } = await loadStaffDirectory(db.orm, capabilities.organizationId)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Planned roster assignments compared with actual clock-in and clock-out times.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/attendance/missing">
            Missing attendance
          </Link>
          {capabilities.canExport ? (
            <Link
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={`/attendance/export?date=${date}`}
            >
              Export CSV
            </Link>
          ) : null}
        </div>
      </div>
      <AttendanceFilters
        action="/attendance"
        date={date}
        departmentId={filters.departmentId}
        departments={[...departments.entries()].map(([id, name]) => ({ id, name }))}
        exceptionType={filters.exceptionType}
        staff={[...staff.values()].map((member) => ({ id: member.id, name: member.name }))}
        staffId={filters.staffId}
        status={filters.status}
      />
      <AttendanceTable rows={rows} timeZone={capabilities.timeZone} />
    </main>
  )
}
