import { Temporal } from "temporal-polyfill"

import { toInstant } from "@/lib/dates/assignment-window"
import {
  calendarDateRangesOverlap,
  compareCalendarDates,
  inclusiveCalendarDayCount,
  parseCalendarDate,
} from "@/lib/dates/calendar-date"
import { calculateShiftDurationMinutes } from "@/lib/dates/shift-time"
import { reportError } from "@/modules/reports/errors"
import { MAX_REPORT_RANGE_DAYS } from "@/modules/reports/types/filters"

export function defaultReportRange(
  timeZone: string,
  now: Temporal.Instant = Temporal.Now.instant(),
) {
  const today = now.toZonedDateTimeISO(timeZone).toPlainDate()
  const dateFrom = today.with({ day: 1 }).toString()
  const dateTo = today.with({ day: 1 }).add({ months: 1 }).subtract({ days: 1 }).toString()
  return { dateFrom, dateTo }
}

export function inclusiveDaySpan(dateFrom: string, dateTo: string) {
  return inclusiveCalendarDayCount(dateFrom, dateTo)
}

export function resolveReportDates(input: {
  dateFrom?: string
  dateTo?: string
  timeZone: string
  now?: Temporal.Instant
}) {
  const fallback = defaultReportRange(input.timeZone, input.now)
  const dateFrom = input.dateFrom ?? input.dateTo ?? fallback.dateFrom
  const dateTo = input.dateTo ?? input.dateFrom ?? fallback.dateTo

  try {
    parseCalendarDate(dateFrom)
    parseCalendarDate(dateTo)
  } catch {
    throw reportError("INVALID_DATE_RANGE")
  }

  if (compareCalendarDates(dateFrom, dateTo) > 0) {
    throw reportError("INVALID_DATE_RANGE")
  }

  if (inclusiveDaySpan(dateFrom, dateTo) > MAX_REPORT_RANGE_DAYS) {
    throw reportError("REPORT_TOO_LARGE")
  }

  return { dateFrom, dateTo }
}

export function clippedInclusiveDays(
  startDate: string,
  endDate: string,
  rangeStart: string,
  rangeEnd: string,
) {
  if (!calendarDateRangesOverlap(startDate, endDate, rangeStart, rangeEnd)) {
    return 0
  }

  const clipStart = compareCalendarDates(startDate, rangeStart) >= 0 ? startDate : rangeStart
  const clipEnd = compareCalendarDates(endDate, rangeEnd) <= 0 ? endDate : rangeEnd
  return inclusiveCalendarDayCount(clipStart, clipEnd)
}

export function assignmentScheduledMinutes(input: {
  startDateTime?: unknown
  endDateTime?: unknown
  shiftStartTime: string
  shiftEndTime: string
  isOvernight: boolean
}) {
  try {
    const start = toInstant(input.startDateTime)
    const end = toInstant(input.endDateTime)
    return Math.max(0, Math.round((end.epochMilliseconds - start.epochMilliseconds) / 60_000))
  } catch {
    return calculateShiftDurationMinutes({
      startTime: input.shiftStartTime,
      endTime: input.shiftEndTime,
      isOvernight: input.isOvernight,
    })
  }
}

export function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100
}

export function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null
  }

  return numerator / denominator
}

export function ratioPercent(numerator: number, denominator: number) {
  const value = ratio(numerator, denominator)
  if (value == null) {
    return null
  }

  return Math.round(value * 1000) / 10
}

export function rateValue(numerator: number, denominator: number) {
  return {
    numerator,
    denominator,
    percent: ratioPercent(numerator, denominator),
  }
}

export function coverageFillRate(
  cells: Array<{ requiredCount: number; assignedCount: number }>,
) {
  let required = 0
  let filled = 0

  for (const cell of cells) {
    if (cell.requiredCount <= 0) {
      continue
    }

    required += cell.requiredCount
    filled += Math.min(cell.assignedCount, cell.requiredCount)
  }

  return rateValue(filled, required)
}

export function cellCoveragePercent(requiredCount: number, assignedCount: number) {
  if (requiredCount <= 0) {
    return null
  }

  return Math.round((assignedCount / requiredCount) * 1000) / 10
}

export function isCompletedAttendanceStatus(status: string) {
  return status === "COMPLETED" || status === "EXCEPTION" || status === "CORRECTED"
}

export function workedMinutesFromRecord(record: {
  status: string
  actualMinutes: number | null
}) {
  if (!isCompletedAttendanceStatus(record.status) || record.actualMinutes == null) {
    return 0
  }

  return record.actualMinutes
}

export function average(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1
  const total = items.length
  const start = (safePage - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    hasNext: start + pageSize < total,
    hasPrevious: safePage > 1 && total > 0,
  }
}
