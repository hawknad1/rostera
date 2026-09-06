import { Temporal } from "temporal-polyfill"

export class CalendarDateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CalendarDateError"
  }
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseCalendarDate(value: string) {
  const trimmed = value.trim()
  const match = ISO_DATE_PATTERN.exec(trimmed)

  if (!match) {
    throw new CalendarDateError("Enter a valid date in YYYY-MM-DD format.")
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  try {
    const date = Temporal.PlainDate.from({ year, month, day }, { overflow: "reject" })
    return date
  } catch {
    throw new CalendarDateError("Enter a valid calendar date.")
  }
}

export function formatCalendarDate(date: Temporal.PlainDate) {
  return date.toString()
}

export function compareCalendarDates(left: string, right: string) {
  return Temporal.PlainDate.compare(parseCalendarDate(left), parseCalendarDate(right))
}

export function isDateInInclusiveRange(date: string, startDate: string, endDate: string) {
  return (
    compareCalendarDates(date, startDate) >= 0 && compareCalendarDates(date, endDate) <= 0
  )
}

export function assertValidDateRange(startDate: string, endDate: string) {
  if (compareCalendarDates(startDate, endDate) > 0) {
    throw new CalendarDateError("The start date must be on or before the end date.")
  }
}

export function enumerateCalendarDates(startDate: string, endDate: string) {
  assertValidDateRange(startDate, endDate)

  const dates: string[] = []
  let current = parseCalendarDate(startDate)
  const end = parseCalendarDate(endDate)

  while (Temporal.PlainDate.compare(current, end) <= 0) {
    dates.push(formatCalendarDate(current))
    current = current.add({ days: 1 })
  }

  return dates
}

export function formatDisplayDate(value: string) {
  return parseCalendarDate(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatDateRange(startDate: string, endDate: string) {
  return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`
}

/** ISO weekday: Monday = 1, Sunday = 7. */
export function isoWeekday(date: string) {
  return parseCalendarDate(date).dayOfWeek
}

export function isWeekendDate(date: string) {
  const weekday = isoWeekday(date)
  return weekday === 6 || weekday === 7
}

export function isoWeekBounds(date: string) {
  const plain = parseCalendarDate(date)
  const start = plain.subtract({ days: plain.dayOfWeek - 1 })
  const end = start.add({ days: 6 })

  return {
    startDate: formatCalendarDate(start),
    endDate: formatCalendarDate(end),
  }
}

export function isDateInIsoWeek(date: string, weekDate: string) {
  const week = isoWeekBounds(weekDate)
  return isDateInInclusiveRange(date, week.startDate, week.endDate)
}
