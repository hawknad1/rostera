import { attendanceExceptionTypes, attendanceStatuses } from "@/modules/attendance/types/attendance"
import { attendanceExceptionLabels, attendanceStatusLabels } from "@/modules/attendance/labels"
import { inputClassName, labelClassName, selectClassName } from "@/modules/organizations/ui/form-styles"

export function AttendanceFilters({
  date,
  departmentId,
  staffId,
  status,
  exceptionType,
  departments,
  staff,
  action,
}: {
  date: string
  departmentId?: string
  staffId?: string
  status?: string
  exceptionType?: string
  departments: Array<{ id: string; name: string }>
  staff: Array<{ id: string; name: string }>
  action: string
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label className={labelClassName} htmlFor="attendance-date">
          Date
        </label>
        <input className={inputClassName} defaultValue={date} id="attendance-date" name="date" type="date" />
      </div>
      <div>
        <label className={labelClassName} htmlFor="attendance-department">
          Department
        </label>
        <select className={selectClassName} defaultValue={departmentId ?? ""} id="attendance-department" name="departmentId">
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="attendance-staff">
          Staff
        </label>
        <select className={selectClassName} defaultValue={staffId ?? ""} id="attendance-staff" name="staffId">
          <option value="">All staff</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="attendance-status">
          Status
        </label>
        <select className={selectClassName} defaultValue={status ?? ""} id="attendance-status" name="status">
          <option value="">All statuses</option>
          {attendanceStatuses.map((value) => (
            <option key={value} value={value}>
              {attendanceStatusLabels[value]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="attendance-exception">
          Exception
        </label>
        <select
          className={selectClassName}
          defaultValue={exceptionType ?? ""}
          id="attendance-exception"
          name="exceptionType"
        >
          <option value="">All exceptions</option>
          {attendanceExceptionTypes.map((value) => (
            <option key={value} value={value}>
              {attendanceExceptionLabels[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-5">
        <button className="text-sm font-medium text-primary underline-offset-4 hover:underline" type="submit">
          Apply filters
        </button>
      </div>
    </form>
  )
}
