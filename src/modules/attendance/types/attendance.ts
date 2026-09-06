export const attendanceStatuses = [
  "OPEN",
  "COMPLETED",
  "MISSED",
  "EXCEPTION",
  "CORRECTED",
  "VOIDED",
] as const

export type AttendanceStatus = (typeof attendanceStatuses)[number]

export const attendanceReviewStatuses = ["UNREVIEWED", "APPROVED", "REJECTED"] as const

export type AttendanceReviewStatus = (typeof attendanceReviewStatuses)[number]

export const attendanceSources = ["STAFF_PWA", "ADMIN", "SYSTEM", "DEVICE"] as const

export type AttendanceSource = (typeof attendanceSources)[number]

export const attendanceEventTypes = [
  "CLOCK_IN",
  "CLOCK_OUT",
  "MANUAL_CLOCK_IN",
  "MANUAL_CLOCK_OUT",
  "CORRECTION",
  "VOID",
] as const

export type AttendanceEventType = (typeof attendanceEventTypes)[number]

export const attendanceExceptionTypes = [
  "LATE_ARRIVAL",
  "EARLY_DEPARTURE",
  "MISSED_CLOCK_IN",
  "MISSED_CLOCK_OUT",
  "UNSCHEDULED_ATTENDANCE",
  "OVERTIME",
  "OUTSIDE_SCHEDULE",
] as const

export type AttendanceExceptionType = (typeof attendanceExceptionTypes)[number]

export const attendanceExceptionStatuses = ["OPEN", "ACKNOWLEDGED", "RESOLVED", "WAIVED"] as const

export type AttendanceExceptionStatus = (typeof attendanceExceptionStatuses)[number]

export const attendanceExceptionSeverities = ["INFO", "WARNING"] as const

export type AttendanceExceptionSeverity = (typeof attendanceExceptionSeverities)[number]

export const OPEN_SESSION_KEY = "OPEN"

export const DEFAULT_ATTENDANCE_POLICY = {
  attendanceEnabled: true,
  lateThresholdMinutes: 0,
  earlyDepartureThresholdMinutes: 0,
  overtimeThresholdMinutes: 0,
  allowUnscheduledAttendance: true,
  allowEarlyClockIn: true,
  maximumEarlyClockInMinutes: 120,
  maximumLateClockOutMinutes: 720,
} as const

export type AttendancePolicyValues = {
  attendanceEnabled: boolean
  lateThresholdMinutes: number
  earlyDepartureThresholdMinutes: number
  overtimeThresholdMinutes: number
  allowUnscheduledAttendance: boolean
  allowEarlyClockIn: boolean
  maximumEarlyClockInMinutes: number
  maximumLateClockOutMinutes: number
}

export type AttendancePolicyRecord = AttendancePolicyValues & {
  id: string
  organizationId: string
}

export type AttendanceExceptionCandidate = {
  type: AttendanceExceptionType
  severity: AttendanceExceptionSeverity
  minutes?: number
}

export type AttendanceCalculation = {
  scheduledMinutes: number | null
  actualMinutes: number | null
  lateMinutes: number
  earlyDepartureMinutes: number
  overtimeMinutes: number
  exceptions: AttendanceExceptionCandidate[]
}

export type AttendanceExceptionView = {
  id: string
  type: AttendanceExceptionType
  severity: AttendanceExceptionSeverity
  status: AttendanceExceptionStatus
  detectedAt: string
  resolvedAt: string | null
  notes: string | null
}

export type AttendanceEventView = {
  id: string
  type: AttendanceEventType
  occurredAt: string
  source: AttendanceSource
  actorUserId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type AttendanceRecordView = {
  id: string
  organizationId: string
  staffId: string
  staffName: string
  staffNumber: string
  departmentId: string
  departmentName: string
  rosterId: string | null
  assignmentId: string | null
  attendanceDate: string
  scheduledStartDateTime: string | null
  scheduledEndDateTime: string | null
  scheduledStartTime: string | null
  scheduledEndTime: string | null
  isOvernight: boolean
  shiftTypeName: string | null
  actualClockInDateTime: string | null
  actualClockOutDateTime: string | null
  scheduledMinutes: number | null
  actualMinutes: number | null
  lateMinutes: number
  earlyDepartureMinutes: number
  overtimeMinutes: number
  status: AttendanceStatus
  reviewStatus: AttendanceReviewStatus
  source: AttendanceSource
  notes: string | null
  approvedByUserId: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  exceptions: AttendanceExceptionView[]
}

export type AttendanceDetailView = AttendanceRecordView & {
  events: AttendanceEventView[]
}

export type MissingAttendanceRow = {
  staffId: string
  staffName: string
  staffNumber: string
  departmentId: string
  departmentName: string
  assignmentId: string
  rosterId: string
  date: string
  shiftTypeName: string
  startTime: string
  endTime: string
  isOvernight: boolean
}

export type StaffAttendanceTodayView = {
  status: "NOT_CLOCKED_IN" | "CLOCKED_IN" | "CLOCKED_OUT"
  record: AttendanceRecordView | null
  planned: {
    assignmentId: string
    date: string
    shiftTypeName: string
    departmentName: string
    startTime: string
    endTime: string
    isOvernight: boolean
    timeLabel: string
  } | null
  elapsedMinutes: number | null
}
