import type {
  AttendanceEventType,
  AttendanceExceptionType,
  AttendanceReviewStatus,
  AttendanceStatus,
} from "@/modules/attendance/types/attendance"

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  OPEN: "Open",
  COMPLETED: "Completed",
  MISSED: "Missed",
  EXCEPTION: "Exception",
  CORRECTED: "Corrected",
  VOIDED: "Voided",
}

export const attendanceReviewLabels: Record<AttendanceReviewStatus, string> = {
  UNREVIEWED: "Unreviewed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
}

export const attendanceEventLabels: Record<AttendanceEventType, string> = {
  CLOCK_IN: "Clock in",
  CLOCK_OUT: "Clock out",
  MANUAL_CLOCK_IN: "Manual clock in",
  MANUAL_CLOCK_OUT: "Manual clock out",
  CORRECTION: "Correction",
  VOID: "Void",
}

export const attendanceExceptionLabels: Record<AttendanceExceptionType, string> = {
  LATE_ARRIVAL: "Late arrival",
  EARLY_DEPARTURE: "Early departure",
  MISSED_CLOCK_IN: "Missed clock-in",
  MISSED_CLOCK_OUT: "Missed clock-out",
  UNSCHEDULED_ATTENDANCE: "Unscheduled attendance",
  OVERTIME: "Overtime",
  OUTSIDE_SCHEDULE: "Outside schedule",
}

export function calmExceptionCopy(type: AttendanceExceptionType, minutes?: number) {
  const duration = minutes != null && minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}` : null

  switch (type) {
    case "LATE_ARRIVAL":
      return duration ? `${duration} late` : "Late arrival"
    case "EARLY_DEPARTURE":
      return duration ? `Left ${duration} early` : "Early departure"
    case "OVERTIME":
      return duration ? `${duration} overtime` : "Overtime"
    case "UNSCHEDULED_ATTENDANCE":
      return "Unscheduled attendance"
    case "OUTSIDE_SCHEDULE":
      return "Outside the planned schedule"
    case "MISSED_CLOCK_IN":
      return "Missing clock-in"
    case "MISSED_CLOCK_OUT":
      return "Missing clock-out"
  }
}
