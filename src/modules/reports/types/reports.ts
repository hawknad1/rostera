import type { CoverageStatus } from "@/modules/scheduling/engine/calculateCoverage"
import type { AttendanceStatus } from "@/modules/attendance/types/attendance"
import type { LeaveType } from "@/modules/leave/schemas/leave"
import type { LeaveStatus } from "@/modules/scheduling/types/leave"

import type { ReportPeriod, SchedulingExceptionBand } from "./filters"

export type RateValue = {
  numerator: number
  denominator: number
  percent: number | null
}

export type MetricValue = {
  value: number
  hours?: number
}

export type OperationsOverview = {
  period: ReportPeriod
  staff: {
    activeStaff: number
    staffWithPublishedAssignments: number
  }
  planned: {
    scheduledShifts: number
    scheduledMinutes: number
    scheduledHours: number
  }
  attendance: {
    records: number
    completedRecords: number
    workedMinutes: number
    workedHours: number
    overtimeMinutes: number
    overtimeHours: number
    lateArrivals: number
    lateMinutes: number
    earlyDepartures: number
    earlyDepartureMinutes: number
    missingAttendance: number
    eligibleAssignments: number
    completion: RateValue
    punctuality: RateValue
    averageLatenessMinutes: number | null
    averageWorkedHours: number | null
  }
  leave: {
    approvedLeaveDays: number
    pendingRequests: number
    approvedRequests: number
    rejectedRequests: number
    cancelledRequests: number
  }
  exceptions: {
    openAttendanceExceptions: number
    schedulingBlockers: number
    schedulingWarnings: number
    schedulingInfos: number
  }
  coverage: {
    requiredPositions: number
    assignedRequiredPositions: number
    fillRate: RateValue
    underCovered: number
    fullyCovered: number
    overCovered: number
    noRequirement: number
  }
}

export type StaffWorkloadRow = {
  staffId: string
  staffName: string
  staffNumber: string
  departmentId: string
  departmentName: string
  professionName: string
  scheduledShifts: number
  scheduledHours: number
  nightShifts: number
  weekendShifts: number
  attendanceSessions: number
  workedHours: number
  lateMinutes: number
  earlyDepartureMinutes: number
  overtimeHours: number
  leaveDays: number
  missingAttendance: number
  openExceptions: number
}

export type AttendanceReportRow = {
  id: string
  attendanceDate: string
  staffId: string
  staffName: string
  staffNumber: string
  departmentName: string
  scheduledShift: string | null
  clockIn: string | null
  clockOut: string | null
  scheduledHours: number | null
  workedHours: number | null
  lateMinutes: number
  earlyDepartureMinutes: number
  overtimeHours: number
  status: AttendanceStatus
  exceptions: string[]
}

export type StaffingReportRow = {
  date: string
  departmentId: string
  departmentName: string
  professionName: string
  shiftTypeName: string
  requiredCount: number
  assignedCount: number
  coveragePercent: number | null
  status: CoverageStatus | "no_requirement"
}

export type LeaveReportRow = {
  id: string
  staffId: string
  staffName: string
  staffNumber: string
  departmentName: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  days: number
  daysInRange: number
  status: LeaveStatus
}

export type LeaveReportSummary = {
  pending: number
  approved: number
  rejected: number
  cancelled: number
  approvedLeaveDays: number
}

export type ExceptionReportRow = {
  band: SchedulingExceptionBand
  code: string
  message: string
  rule: string
  date: string | null
  staffName: string | null
  rosterName: string | null
  rosterId: string | null
}

export type ReportPage<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasNext: boolean
  hasPrevious: boolean
  dateFrom: string
  dateTo: string
}

export type ReportLookups = {
  timeZone: string
  canExport: boolean
  departments: Array<{ id: string; name: string }>
  professions: Array<{ id: string; name: string }>
  staff: Array<{ id: string; name: string }>
  shiftTypes: Array<{ id: string; name: string }>
  publishedRosters: Array<{
    id: string
    name: string
    seriesId: string
    versionNumber: number
  }>
  rosterSeries: Array<{ id: string; name: string }>
}

export type CsvExportResult = {
  filename: string
  csv: string
  contentType: string
}
