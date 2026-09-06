import { attendanceExceptionTypes, attendanceStatuses } from "@/modules/attendance/types/attendance"
import { attendanceExceptionLabels, attendanceStatusLabels } from "@/modules/attendance/labels"
import { leaveTypes } from "@/modules/leave/schemas/leave"
import { leaveStatuses } from "@/modules/scheduling/types/leave"
import { leaveStatusLabels, leaveTypeLabels } from "@/modules/leave/labels"
import { inputClassName, labelClassName, selectClassName } from "@/modules/organizations/ui/form-styles"
import { schedulingExceptionBands } from "@/modules/reports/types/filters"
import type { ReportFilterInput } from "@/modules/reports/types/filters"
import type { ReportLookups } from "@/modules/reports/types/reports"
import { schedulingExceptionBandLabels } from "@/modules/reports/labels"

type FilterVisibility = {
  staff?: boolean
  shiftType?: boolean
  roster?: boolean
  attendanceStatus?: boolean
  exceptionType?: boolean
  leaveType?: boolean
  leaveStatus?: boolean
  schedulingSeverity?: boolean
}

export function ReportFilters({
  action,
  filters,
  lookups,
  show = {},
}: {
  action: string
  filters: ReportFilterInput
  lookups: ReportLookups
  show?: FilterVisibility
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className={labelClassName} htmlFor="report-date-from">
          From
        </label>
        <input
          className={inputClassName}
          defaultValue={filters.dateFrom ?? ""}
          id="report-date-from"
          name="dateFrom"
          type="date"
        />
      </div>
      <div>
        <label className={labelClassName} htmlFor="report-date-to">
          To
        </label>
        <input
          className={inputClassName}
          defaultValue={filters.dateTo ?? ""}
          id="report-date-to"
          name="dateTo"
          type="date"
        />
      </div>
      <div>
        <label className={labelClassName} htmlFor="report-department">
          Department
        </label>
        <select
          className={selectClassName}
          defaultValue={filters.departmentId ?? ""}
          id="report-department"
          name="departmentId"
        >
          <option value="">All departments</option>
          {lookups.departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="report-profession">
          Profession
        </label>
        <select
          className={selectClassName}
          defaultValue={filters.professionId ?? ""}
          id="report-profession"
          name="professionId"
        >
          <option value="">All professions</option>
          {lookups.professions.map((profession) => (
            <option key={profession.id} value={profession.id}>
              {profession.name}
            </option>
          ))}
        </select>
      </div>
      {show.staff !== false ? (
        <div>
          <label className={labelClassName} htmlFor="report-staff">
            Staff
          </label>
          <select
            className={selectClassName}
            defaultValue={filters.staffId ?? ""}
            id="report-staff"
            name="staffId"
          >
            <option value="">All staff</option>
            {lookups.staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {show.shiftType !== false ? (
        <div>
          <label className={labelClassName} htmlFor="report-shift">
            Shift type
          </label>
          <select
            className={selectClassName}
            defaultValue={filters.shiftTypeId ?? ""}
            id="report-shift"
            name="shiftTypeId"
          >
            <option value="">All shift types</option>
            {lookups.shiftTypes.map((shiftType) => (
              <option key={shiftType.id} value={shiftType.id}>
                {shiftType.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {show.roster ? (
        <div>
          <label className={labelClassName} htmlFor="report-roster">
            Roster version
          </label>
          <select
            className={selectClassName}
            defaultValue={filters.rosterId ?? ""}
            id="report-roster"
            name="rosterId"
          >
            <option value="">Current published versions</option>
            {lookups.publishedRosters.map((roster) => (
              <option key={roster.id} value={roster.id}>
                {roster.name} · v{roster.versionNumber}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {show.attendanceStatus ? (
        <div>
          <label className={labelClassName} htmlFor="report-attendance-status">
            Attendance status
          </label>
          <select
            className={selectClassName}
            defaultValue={filters.attendanceStatus ?? ""}
            id="report-attendance-status"
            name="attendanceStatus"
          >
            <option value="">All statuses</option>
            {attendanceStatuses.map((status) => (
              <option key={status} value={status}>
                {attendanceStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {show.exceptionType ? (
        <div>
          <label className={labelClassName} htmlFor="report-exception-type">
            Attendance exception
          </label>
          <select
            className={selectClassName}
            defaultValue={filters.exceptionType ?? ""}
            id="report-exception-type"
            name="exceptionType"
          >
            <option value="">All exceptions</option>
            {attendanceExceptionTypes.map((type) => (
              <option key={type} value={type}>
                {attendanceExceptionLabels[type]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {show.leaveType ? (
        <div>
          <label className={labelClassName} htmlFor="report-leave-type">
            Leave type
          </label>
          <select
            className={selectClassName}
            defaultValue={filters.leaveType ?? ""}
            id="report-leave-type"
            name="leaveType"
          >
            <option value="">All leave types</option>
            {leaveTypes.map((type) => (
              <option key={type} value={type}>
                {leaveTypeLabels[type]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {show.leaveStatus ? (
        <div>
          <label className={labelClassName} htmlFor="report-leave-status">
            Leave status
          </label>
          <select
            className={selectClassName}
            defaultValue={filters.leaveStatus ?? ""}
            id="report-leave-status"
            name="leaveStatus"
          >
            <option value="">All statuses</option>
            {leaveStatuses.map((status) => (
              <option key={status} value={status}>
                {leaveStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {show.schedulingSeverity ? (
        <div>
          <label className={labelClassName} htmlFor="report-severity">
            Exception severity
          </label>
          <select
            className={selectClassName}
            defaultValue={filters.schedulingSeverity ?? ""}
            id="report-severity"
            name="schedulingSeverity"
          >
            <option value="">All severities</option>
            {schedulingExceptionBands.map((band) => (
              <option key={band} value={band}>
                {schedulingExceptionBandLabels[band]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="sm:col-span-2 lg:col-span-4">
        <button className="text-sm font-medium text-primary underline-offset-4 hover:underline" type="submit">
          Apply filters
        </button>
      </div>
    </form>
  )
}
