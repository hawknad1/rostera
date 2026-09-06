import { Temporal } from "temporal-polyfill"

import type {
  AttendanceCalculation,
  AttendanceExceptionCandidate,
  AttendancePolicyValues,
} from "@/modules/attendance/types/attendance"

export class AttendanceCalculationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AttendanceCalculationError"
  }
}

export type AttendanceCalculationInput = {
  scheduledStart: Temporal.Instant | null
  scheduledEnd: Temporal.Instant | null
  clockIn: Temporal.Instant | null
  clockOut: Temporal.Instant | null
  policy: Pick<
    AttendancePolicyValues,
    | "lateThresholdMinutes"
    | "earlyDepartureThresholdMinutes"
    | "overtimeThresholdMinutes"
    | "maximumLateClockOutMinutes"
  >
  unscheduled?: boolean
  onApprovedLeave?: boolean
}

export function minutesBetween(start: Temporal.Instant, end: Temporal.Instant) {
  const ms = Number(end.epochMilliseconds - start.epochMilliseconds)
  return Math.floor(ms / 60_000)
}

function exception(
  type: AttendanceExceptionCandidate["type"],
  severity: AttendanceExceptionCandidate["severity"],
  minutes?: number,
): AttendanceExceptionCandidate {
  return minutes === undefined ? { type, severity } : { type, severity, minutes }
}

export function calculateAttendance(input: AttendanceCalculationInput): AttendanceCalculation {
  const { scheduledStart, scheduledEnd, clockIn, clockOut, policy } = input
  const unscheduled = Boolean(input.unscheduled || !scheduledStart || !scheduledEnd)

  if (scheduledStart && scheduledEnd && Temporal.Instant.compare(scheduledEnd, scheduledStart) <= 0) {
    throw new AttendanceCalculationError("Scheduled end must be after scheduled start.")
  }

  if (clockIn && clockOut && Temporal.Instant.compare(clockOut, clockIn) <= 0) {
    throw new AttendanceCalculationError("Clock-out must be after clock-in.")
  }

  const scheduledMinutes =
    scheduledStart && scheduledEnd ? minutesBetween(scheduledStart, scheduledEnd) : null
  const actualMinutes = clockIn && clockOut ? minutesBetween(clockIn, clockOut) : null

  let lateMinutes = 0
  let earlyDepartureMinutes = 0
  let overtimeMinutes = 0

  if (!unscheduled && scheduledStart && clockIn) {
    const delay = minutesBetween(scheduledStart, clockIn)
    lateMinutes = Math.max(0, delay)
  }

  if (!unscheduled && scheduledEnd && clockOut) {
    const early = minutesBetween(clockOut, scheduledEnd)
    const overtime = minutesBetween(scheduledEnd, clockOut)
    if (early > 0) {
      earlyDepartureMinutes = early
    } else {
      overtimeMinutes = Math.max(0, Math.min(overtime, policy.maximumLateClockOutMinutes))
    }
  }

  const exceptions: AttendanceExceptionCandidate[] = []

  if (unscheduled) {
    exceptions.push(exception("UNSCHEDULED_ATTENDANCE", "WARNING"))
  }

  if (input.onApprovedLeave) {
    exceptions.push(exception("OUTSIDE_SCHEDULE", "INFO"))
  }

  if (lateMinutes > policy.lateThresholdMinutes) {
    exceptions.push(exception("LATE_ARRIVAL", "WARNING", lateMinutes))
  }

  if (earlyDepartureMinutes > policy.earlyDepartureThresholdMinutes) {
    exceptions.push(exception("EARLY_DEPARTURE", "WARNING", earlyDepartureMinutes))
  }

  if (overtimeMinutes > policy.overtimeThresholdMinutes) {
    exceptions.push(exception("OVERTIME", "WARNING", overtimeMinutes))
  }

  return {
    scheduledMinutes,
    actualMinutes,
    lateMinutes,
    earlyDepartureMinutes,
    overtimeMinutes,
    exceptions,
  }
}

export function recordStatusFromCalculation(input: {
  clockIn: Temporal.Instant | null
  clockOut: Temporal.Instant | null
  corrected: boolean
  hasOpenExceptions: boolean
}): "OPEN" | "COMPLETED" | "EXCEPTION" | "CORRECTED" {
  if (input.corrected) {
    return "CORRECTED"
  }

  if (input.clockIn && !input.clockOut) {
    return "OPEN"
  }

  if (input.hasOpenExceptions) {
    return "EXCEPTION"
  }

  return "COMPLETED"
}
