import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { missingAttendanceFilterSchema } from "@/modules/attendance/schemas/attendance"
import { getAttendanceCapabilities } from "@/modules/attendance/services/capabilities"
import { loadStaffDirectory, shiftTypeNames } from "@/modules/attendance/services/map"
import { listMissingAttendance } from "@/modules/attendance/services/missing"
import { inputClassName, labelClassName, selectClassName } from "@/modules/organizations/ui/form-styles"
import { todayInTimeZone } from "@/modules/staff-app/format"
import { db } from "@/prisma/db"

export default async function MissingAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission(permissions.attendanceView)
  const params = await searchParams
  const parsed = missingAttendanceFilterSchema.safeParse({
    date: typeof params.date === "string" ? params.date : undefined,
    departmentId: typeof params.departmentId === "string" ? params.departmentId : undefined,
    shiftTypeId: typeof params.shiftTypeId === "string" ? params.shiftTypeId : undefined,
  })
  const filters = parsed.success ? parsed.data : {}
  const [rows, capabilities] = await Promise.all([
    listMissingAttendance(filters),
    getAttendanceCapabilities(),
  ])
  const date = filters.date ?? todayInTimeZone(capabilities.timeZone)
  const { departments } = await loadStaffDirectory(db.orm, capabilities.organizationId)
  const types = await shiftTypeNames(db.orm, capabilities.organizationId)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/attendance">
          Back to attendance
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Missing attendance</h1>
        <p className="text-sm text-muted-foreground">
          Staff who were scheduled on a published roster but have no attendance record. Approved leave is
          excluded. This is not an absence determination.
        </p>
      </div>

      <form action="/attendance/missing" className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClassName} htmlFor="missing-date">
            Date
          </label>
          <input className={inputClassName} defaultValue={date} id="missing-date" name="date" type="date" />
        </div>
        <div>
          <label className={labelClassName} htmlFor="missing-department">
            Department
          </label>
          <select
            className={selectClassName}
            defaultValue={filters.departmentId ?? ""}
            id="missing-department"
            name="departmentId"
          >
            <option value="">All departments</option>
            {[...departments.entries()].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor="missing-shift-type">
            Shift type
          </label>
          <select
            className={selectClassName}
            defaultValue={filters.shiftTypeId ?? ""}
            id="missing-shift-type"
            name="shiftTypeId"
          >
            <option value="">All shift types</option>
            {[...types.entries()].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <button className="text-sm font-medium text-primary underline-offset-4 hover:underline" type="submit">
            Apply filters
          </button>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No missing attendance for this date.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <li className="border-b border-border py-3 last:border-b-0" key={row.assignmentId}>
              <p className="text-sm font-medium">{row.staffName}</p>
              <p className="text-sm text-muted-foreground">
                {row.departmentName} · {row.shiftTypeName} · {row.startTime} – {row.endTime}
                {row.isOvernight ? " · overnight" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
