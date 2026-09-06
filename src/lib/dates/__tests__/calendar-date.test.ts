import { describe, expect, it } from "vitest"

import {
  assertValidDateRange,
  CalendarDateError,
  calendarDateRangesOverlap,
  compareCalendarDates,
  enumerateCalendarDates,
  inclusiveCalendarDayCount,
  isDateInInclusiveRange,
  isDateInIsoWeek,
  isoWeekBounds,
  isoWeekday,
  isWeekendDate,
  parseCalendarDate,
} from "@/lib/dates/calendar-date"

describe("parseCalendarDate", () => {
  it("parses ISO calendar dates", () => {
    const date = parseCalendarDate("2026-09-03")
    expect(date.year).toBe(2026)
    expect(date.month).toBe(9)
    expect(date.day).toBe(3)
  })

  it("rejects invalid formats and calendar dates", () => {
    expect(() => parseCalendarDate("03-09-2026")).toThrow(CalendarDateError)
    expect(() => parseCalendarDate("2026-9-3")).toThrow(CalendarDateError)
    expect(() => parseCalendarDate("2026-02-31")).toThrow(CalendarDateError)
    expect(() => parseCalendarDate("")).toThrow(CalendarDateError)
  })
})

describe("calendar date ranges", () => {
  it("accepts a single-day range", () => {
    expect(compareCalendarDates("2026-09-01", "2026-09-01")).toBe(0)
    expect(() => assertValidDateRange("2026-09-01", "2026-09-01")).not.toThrow()
    expect(enumerateCalendarDates("2026-09-01", "2026-09-01")).toEqual(["2026-09-01"])
  })

  it("rejects a start date after the end date", () => {
    expect(() => assertValidDateRange("2026-09-30", "2026-09-01")).toThrow(CalendarDateError)
  })

  it("enumerates inclusive dates", () => {
    expect(enumerateCalendarDates("2026-09-29", "2026-10-01")).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
    ])
  })

  it("treats roster bounds as inclusive", () => {
    expect(isDateInInclusiveRange("2026-09-01", "2026-09-01", "2026-09-30")).toBe(true)
    expect(isDateInInclusiveRange("2026-09-30", "2026-09-01", "2026-09-30")).toBe(true)
    expect(isDateInInclusiveRange("2026-08-31", "2026-09-01", "2026-09-30")).toBe(false)
    expect(isDateInInclusiveRange("2026-10-01", "2026-09-01", "2026-09-30")).toBe(false)
  })

  it("counts inclusive calendar days without using timestamps", () => {
    expect(inclusiveCalendarDayCount("2026-09-10", "2026-09-10")).toBe(1)
    expect(inclusiveCalendarDayCount("2026-09-10", "2026-09-12")).toBe(3)
  })

  it("detects inclusive date-range overlap and allows adjacent ranges", () => {
    expect(calendarDateRangesOverlap("2026-09-10", "2026-09-15", "2026-09-10", "2026-09-15")).toBe(
      true,
    )
    expect(calendarDateRangesOverlap("2026-09-10", "2026-09-15", "2026-09-13", "2026-09-17")).toBe(
      true,
    )
    expect(calendarDateRangesOverlap("2026-09-10", "2026-09-20", "2026-09-12", "2026-09-14")).toBe(
      true,
    )
    expect(calendarDateRangesOverlap("2026-09-12", "2026-09-14", "2026-09-10", "2026-09-20")).toBe(
      true,
    )
    expect(calendarDateRangesOverlap("2026-09-10", "2026-09-12", "2026-09-13", "2026-09-15")).toBe(
      false,
    )
  })
})

describe("ISO week and weekend", () => {
  it("uses Monday = 1 and Sunday = 7", () => {
    expect(isoWeekday("2026-08-31")).toBe(1)
    expect(isoWeekday("2026-09-03")).toBe(4)
    expect(isoWeekday("2026-09-05")).toBe(6)
    expect(isoWeekday("2026-09-06")).toBe(7)
  })

  it("treats Saturday and Sunday as weekend days", () => {
    expect(isWeekendDate("2026-09-04")).toBe(false)
    expect(isWeekendDate("2026-09-05")).toBe(true)
    expect(isWeekendDate("2026-09-06")).toBe(true)
  })

  it("returns the Monday–Sunday ISO week that contains a date", () => {
    expect(isoWeekBounds("2026-09-03")).toEqual({
      startDate: "2026-08-31",
      endDate: "2026-09-06",
    })
    expect(isDateInIsoWeek("2026-08-31", "2026-09-03")).toBe(true)
    expect(isDateInIsoWeek("2026-09-06", "2026-09-03")).toBe(true)
    expect(isDateInIsoWeek("2026-08-30", "2026-09-03")).toBe(false)
    expect(isDateInIsoWeek("2026-09-07", "2026-09-03")).toBe(false)
  })
})
