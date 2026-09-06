import type { AttendanceExceptionType, AttendanceStatus } from "@/modules/attendance/types/attendance"
import type { LeaveType } from "@/modules/leave/schemas/leave"
import type { LeaveStatus } from "@/modules/scheduling/types/leave"

export const REPORT_PAGE_SIZE = 25
export const MAX_REPORT_RANGE_DAYS = 93
export const MAX_EXPORT_ROWS = 10_000

export const reportRosterModes = ["operational", "historical_version"] as const
export type ReportRosterMode = (typeof reportRosterModes)[number]

export const schedulingExceptionBands = ["BLOCKING", "WARNING", "INFO"] as const
export type SchedulingExceptionBand = (typeof schedulingExceptionBands)[number]

export type ReportFilterInput = {
  dateFrom?: string
  dateTo?: string
  departmentId?: string
  professionId?: string
  staffId?: string
  shiftTypeId?: string
  rosterSeriesId?: string
  rosterId?: string
  attendanceStatus?: AttendanceStatus
  exceptionType?: AttendanceExceptionType
  leaveType?: LeaveType
  leaveStatus?: LeaveStatus
  schedulingSeverity?: SchedulingExceptionBand
  page?: number
}

export type ResolvedReportFilters = {
  dateFrom: string
  dateTo: string
  departmentId?: string
  professionId?: string
  staffId?: string
  shiftTypeId?: string
  rosterSeriesId?: string
  rosterId?: string
  attendanceStatus?: AttendanceStatus
  exceptionType?: AttendanceExceptionType
  leaveType?: LeaveType
  leaveStatus?: LeaveStatus
  schedulingSeverity?: SchedulingExceptionBand
  page: number
}

export type ReportPeriod = {
  dateFrom: string
  dateTo: string
  timeZone: string
  rosterMode: ReportRosterMode
  rosterId: string | null
  rosterSeriesId: string | null
}
