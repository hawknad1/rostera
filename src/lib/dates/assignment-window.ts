import { Temporal } from "temporal-polyfill"

import { parseCalendarDate } from "@/lib/dates/calendar-date"
import { calculateShiftDurationMinutes, parseShiftTime, ShiftTimeError } from "@/lib/dates/shift-time"

export class AssignmentWindowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AssignmentWindowError"
  }
}

export function toInstant(value: unknown): Temporal.Instant {
  if (value instanceof Temporal.Instant) {
    return value
  }

  if (typeof value === "string") {
    return Temporal.Instant.from(value)
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "epochNanoseconds" in value &&
    typeof (value as { epochNanoseconds: unknown }).epochNanoseconds === "bigint"
  ) {
    return Temporal.Instant.fromEpochNanoseconds(
      (value as { epochNanoseconds: bigint }).epochNanoseconds,
    )
  }

  throw new AssignmentWindowError("Unable to read the assignment time window.")
}

export function assignmentDateTimeWindow(input: {
  date: string
  startTime: string
  endTime: string
  isOvernight: boolean
  timeZone: string
}) {
  try {
    calculateShiftDurationMinutes({
      startTime: input.startTime,
      endTime: input.endTime,
      isOvernight: input.isOvernight,
    })
  } catch (error) {
    throw new AssignmentWindowError(
      error instanceof ShiftTimeError || error instanceof Error
        ? error.message
        : "Enter a valid shift window.",
    )
  }

  const date = parseCalendarDate(input.date)
  const start = parseShiftTime(input.startTime)
  const end = parseShiftTime(input.endTime)
  const endDate = input.isOvernight ? date.add({ days: 1 }) : date

  try {
    const startZoned = Temporal.ZonedDateTime.from(
      {
        timeZone: input.timeZone,
        year: date.year,
        month: date.month,
        day: date.day,
        hour: start.hours,
        minute: start.minutes,
      },
      { overflow: "reject" },
    )
    const endZoned = Temporal.ZonedDateTime.from(
      {
        timeZone: input.timeZone,
        year: endDate.year,
        month: endDate.month,
        day: endDate.day,
        hour: end.hours,
        minute: end.minutes,
      },
      { overflow: "reject" },
    )

    return {
      start: startZoned.toInstant(),
      end: endZoned.toInstant(),
    }
  } catch {
    throw new AssignmentWindowError("Unable to interpret this shift in the organization timezone.")
  }
}

export function intervalsOverlap(
  existingStart: Temporal.Instant,
  existingEnd: Temporal.Instant,
  nextStart: Temporal.Instant,
  nextEnd: Temporal.Instant,
) {
  return (
    Temporal.Instant.compare(existingStart, nextEnd) < 0 &&
    Temporal.Instant.compare(existingEnd, nextStart) > 0
  )
}
