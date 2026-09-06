import { Temporal } from "temporal-polyfill"

import { formatDateRange, formatDisplayDate, parseCalendarDate } from "@/lib/dates/calendar-date"

export const OFFLINE_MUTATION_MESSAGE = "You're offline. Reconnect to submit this request."

export function organizationNow(timeZone: string, now: Temporal.Instant = Temporal.Now.instant()) {
  return now.toZonedDateTimeISO(timeZone)
}

export function todayInTimeZone(timeZone: string, now: Temporal.Instant = Temporal.Now.instant()) {
  return organizationNow(timeZone, now).toPlainDate().toString()
}

export function greetingForHour(hour: number) {
  if (hour < 12) {
    return "Good morning"
  }

  if (hour < 17) {
    return "Good afternoon"
  }

  return "Good evening"
}

export function greetingInTimeZone(timeZone: string, now: Temporal.Instant = Temporal.Now.instant()) {
  return greetingForHour(organizationNow(timeZone, now).hour)
}

export function formatWeekdayShort(date: string) {
  return parseCalendarDate(date).toLocaleString("en-GB", { weekday: "short" })
}

export function formatTimeWindow(startTime: string, endTime: string, isOvernight: boolean) {
  return `${startTime}–${endTime}${isOvernight ? " · overnight" : ""}`
}

export function relativeDayLabel(
  date: string,
  timeZone: string,
  now: Temporal.Instant = Temporal.Now.instant(),
) {
  const today = parseCalendarDate(todayInTimeZone(timeZone, now))
  const target = parseCalendarDate(date)
  const days = today.until(target, { largestUnit: "days" }).days

  if (days === 0) {
    return "Today"
  }

  if (days === 1) {
    return "Tomorrow"
  }

  if (days === -1) {
    return "Yesterday"
  }

  if (days > 1 && days < 7) {
    return formatWeekdayShort(date)
  }

  return formatDisplayDate(date)
}

export function rosterPeriodLabel(startDate: string, endDate: string) {
  return formatDateRange(startDate, endDate)
}

export function formatCachedAt(cachedAt: string, timeZone: string) {
  try {
    return Temporal.Instant.from(cachedAt).toZonedDateTimeISO(timeZone).toLocaleString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return cachedAt
  }
}

export function offlineBannerText(cachedAt: string, timeZone: string) {
  return `Offline · Showing roster last updated ${formatCachedAt(cachedAt, timeZone)}`
}

export function instantToIso(value: unknown) {
  if (!value) {
    return ""
  }

  if (typeof value === "object" && value !== null && "toString" in value) {
    try {
      return Temporal.Instant.from(String(value)).toString()
    } catch {
      return String(value)
    }
  }

  try {
    return Temporal.Instant.from(String(value)).toString()
  } catch {
    return String(value)
  }
}

export function isShiftInProgress(
  startDateTime: unknown,
  endDateTime: unknown,
  now: Temporal.Instant = Temporal.Now.instant(),
) {
  try {
    const start = Temporal.Instant.from(instantToIso(startDateTime))
    const end = Temporal.Instant.from(instantToIso(endDateTime))
    return Temporal.Instant.compare(now, start) >= 0 && Temporal.Instant.compare(now, end) < 0
  } catch {
    return false
  }
}

export function compareShiftStart(left: { date: string; startTime: string }, right: { date: string; startTime: string }) {
  const date = left.date.localeCompare(right.date)
  if (date !== 0) {
    return date
  }

  return left.startTime.localeCompare(right.startTime)
}
