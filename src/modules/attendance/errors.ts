export const attendanceErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "ATTENDANCE_DISABLED",
  "STAFF_NOT_LINKED",
  "STAFF_INACTIVE",
  "ALREADY_CLOCKED_IN",
  "NO_OPEN_ATTENDANCE",
  "CLOCK_OUT_NOT_ALLOWED",
  "UNSCHEDULED_NOT_ALLOWED",
  "EARLY_CLOCK_IN_NOT_ALLOWED",
  "ATTENDANCE_NOT_FOUND",
  "UNAUTHORIZED_ATTENDANCE_ACCESS",
  "CORRECTION_REASON_REQUIRED",
  "CORRECTION_NOT_ALLOWED",
  "ATTENDANCE_ALREADY_VOIDED",
  "ATTENDANCE_NOT_REVIEWABLE",
  "INVALID_CLOCK_ORDER",
  "FAILED",
] as const

export type AttendanceErrorCode = (typeof attendanceErrorCodes)[number]

export class AttendanceError extends Error {
  readonly code: AttendanceErrorCode

  constructor(code: AttendanceErrorCode, message: string) {
    super(message)
    this.name = "AttendanceError"
    this.code = code
  }
}

export function isAttendanceError(error: unknown): error is AttendanceError {
  return error instanceof AttendanceError
}

export const attendanceErrorMessages: Record<AttendanceErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in to manage attendance.",
  FORBIDDEN: "You do not have permission to perform this action.",
  ATTENDANCE_DISABLED: "Attendance tracking is disabled for this organization.",
  STAFF_NOT_LINKED: "Your account is not linked to a staff record.",
  STAFF_INACTIVE: "Inactive or terminated staff cannot create attendance events.",
  ALREADY_CLOCKED_IN: "You already have an open attendance session.",
  NO_OPEN_ATTENDANCE: "There is no open attendance session to clock out of.",
  CLOCK_OUT_NOT_ALLOWED: "This attendance record cannot be clocked out.",
  UNSCHEDULED_NOT_ALLOWED: "Unscheduled attendance is not allowed.",
  EARLY_CLOCK_IN_NOT_ALLOWED: "Early clock-in is not allowed for this shift.",
  ATTENDANCE_NOT_FOUND: "Attendance record not found.",
  UNAUTHORIZED_ATTENDANCE_ACCESS: "You cannot access this attendance record.",
  CORRECTION_REASON_REQUIRED: "A reason is required to correct attendance.",
  CORRECTION_NOT_ALLOWED: "This attendance record cannot be corrected.",
  ATTENDANCE_ALREADY_VOIDED: "This attendance record has been voided.",
  ATTENDANCE_NOT_REVIEWABLE: "This attendance record cannot be approved or rejected.",
  INVALID_CLOCK_ORDER: "Clock-out must be after clock-in.",
  FAILED: "Unable to complete this attendance action. Please try again.",
}

export function attendanceError(code: AttendanceErrorCode) {
  return new AttendanceError(code, attendanceErrorMessages[code])
}
