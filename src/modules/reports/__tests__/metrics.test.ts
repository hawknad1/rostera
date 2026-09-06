import { Temporal } from "temporal-polyfill"
import { describe, expect, it } from "vitest"

import { assignmentDateTimeWindow } from "@/lib/dates/assignment-window"
import {
  assignmentScheduledMinutes,
  average,
  cellCoveragePercent,
  coverageFillRate,
  defaultReportRange,
  minutesToHours,
  rateValue,
  resolveReportDates,
  workedMinutesFromRecord,
} from "@/modules/reports/services/metrics"
import { ReportError } from "@/modules/reports/errors"

describe("report metric formulas", () => {
  it("converts scheduled minutes to hours", () => {
    expect(minutesToHours(480)).toBe(8)
    expect(minutesToHours(510)).toBe(8.5)
  })

  it("uses attendance actual minutes for worked time and never scheduled minutes", () => {
    expect(workedMinutesFromRecord({ status: "COMPLETED", actualMinutes: 485 })).toBe(485)
    expect(workedMinutesFromRecord({ status: "OPEN", actualMinutes: null })).toBe(0)
    expect(workedMinutesFromRecord({ status: "VOIDED", actualMinutes: 480 })).toBe(0)
    expect(workedMinutesFromRecord({ status: "COMPLETED", actualMinutes: null })).toBe(0)
  })

  it("returns null rates when the denominator is zero", () => {
    expect(rateValue(0, 0)).toEqual({ numerator: 0, denominator: 0, percent: null })
    expect(rateValue(5, 0).percent).toBeNull()
    expect(average([])).toBeNull()
  })

  it("computes attendance completion and punctuality from explicit numerators", () => {
    expect(rateValue(8, 10).percent).toBe(80)
    expect(rateValue(9, 10).percent).toBe(90)
  })

  it("treats zero required positions as no coverage data, not 100%", () => {
    expect(cellCoveragePercent(0, 4)).toBeNull()
    expect(coverageFillRate([{ requiredCount: 0, assignedCount: 3 }])).toEqual({
      numerator: 0,
      denominator: 0,
      percent: null,
    })
  })

  it("caps overview fill rate at 100% while still counting overstaffed cells separately", () => {
    const fill = coverageFillRate([
      { requiredCount: 2, assignedCount: 1 },
      { requiredCount: 2, assignedCount: 4 },
    ])
    expect(fill).toEqual({ numerator: 3, denominator: 4, percent: 75 })
    expect(cellCoveragePercent(2, 4)).toBe(200)
  })

  it("uses assignment snapshot instants for overnight duration", () => {
    const window = assignmentDateTimeWindow({
      date: "2026-09-10",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      timeZone: "UTC",
    })

    expect(
      assignmentScheduledMinutes({
        startDateTime: window.start,
        endDateTime: window.end,
        shiftStartTime: "22:00",
        shiftEndTime: "06:00",
        isOvernight: true,
      }),
    ).toBe(480)
  })

  it("uses stored instants across a daylight-saving transition", () => {
    const window = assignmentDateTimeWindow({
      date: "2026-03-07",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      timeZone: "America/New_York",
    })
    const minutes = assignmentScheduledMinutes({
      startDateTime: window.start,
      endDateTime: window.end,
      shiftStartTime: "22:00",
      shiftEndTime: "06:00",
      isOvernight: true,
    })

    expect(minutes).toBe(
      Math.round((window.end.epochMilliseconds - window.start.epochMilliseconds) / 60_000),
    )
    expect(minutes).toBe(420)
  })
})

describe("report date range", () => {
  it("uses the organization timezone for the default calendar month", () => {
    const utcAugust = Temporal.Instant.from("2026-08-31T12:00:00Z")
    expect(defaultReportRange("UTC", utcAugust)).toEqual({
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
    })
    expect(defaultReportRange("Pacific/Auckland", utcAugust)).toEqual({
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
    })
  })

  it("rejects inverted and oversized ranges", () => {
    expect(() =>
      resolveReportDates({ dateFrom: "2026-09-30", dateTo: "2026-09-01", timeZone: "UTC" }),
    ).toThrow(ReportError)

    try {
      resolveReportDates({ dateFrom: "2026-01-01", dateTo: "2026-04-30", timeZone: "UTC" })
      throw new Error("expected REPORT_TOO_LARGE")
    } catch (error) {
      expect(error).toMatchObject({ code: "REPORT_TOO_LARGE" })
    }
  })
})
