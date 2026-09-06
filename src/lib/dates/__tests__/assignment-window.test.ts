import { Temporal } from "temporal-polyfill"
import { describe, expect, it } from "vitest"

import {
  assignmentDateTimeWindow,
  intervalsOverlap,
} from "@/lib/dates/assignment-window"

describe("assignmentDateTimeWindow", () => {
  it("derives a same-day window in the organization timezone", () => {
    const window = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
      isOvernight: false,
      timeZone: "Africa/Accra",
    })

    expect(window.start.toString()).toBe("2026-09-03T08:00:00Z")
    expect(window.end.toString()).toBe("2026-09-03T16:00:00Z")
  })

  it("places overnight ends on the following calendar day", () => {
    const window = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      timeZone: "Africa/Accra",
    })

    expect(window.start.toString()).toBe("2026-09-03T22:00:00Z")
    expect(window.end.toString()).toBe("2026-09-04T06:00:00Z")
  })

  it("allows a September 30 overnight assignment to end on October 1", () => {
    const window = assignmentDateTimeWindow({
      date: "2026-09-30",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      timeZone: "Africa/Accra",
    })

    expect(window.start.toString()).toBe("2026-09-30T22:00:00Z")
    expect(window.end.toString()).toBe("2026-10-01T06:00:00Z")
  })

  it("interprets times in the supplied timezone rather than a hardcoded zone", () => {
    const window = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
      isOvernight: false,
      timeZone: "America/New_York",
    })

    expect(window.start.toString()).toBe("2026-09-03T12:00:00Z")
    expect(window.end.toString()).toBe("2026-09-03T20:00:00Z")
  })
})

describe("intervalsOverlap", () => {
  it("rejects overlapping windows", () => {
    const morning = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
      isOvernight: false,
      timeZone: "Africa/Accra",
    })
    const overlapping = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "14:00",
      endTime: "22:00",
      isOvernight: false,
      timeZone: "Africa/Accra",
    })

    expect(intervalsOverlap(morning.start, morning.end, overlapping.start, overlapping.end)).toBe(
      true,
    )
  })

  it("allows adjacent windows that only touch", () => {
    const day = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
      isOvernight: false,
      timeZone: "Africa/Accra",
    })
    const evening = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "16:00",
      endTime: "00:00",
      isOvernight: true,
      timeZone: "Africa/Accra",
    })

    expect(intervalsOverlap(day.start, day.end, evening.start, evening.end)).toBe(false)
  })

  it("detects overnight overlap into the next morning", () => {
    const night = assignmentDateTimeWindow({
      date: "2026-09-03",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      timeZone: "Africa/Accra",
    })
    const early = assignmentDateTimeWindow({
      date: "2026-09-04",
      startTime: "05:00",
      endTime: "13:00",
      isOvernight: false,
      timeZone: "Africa/Accra",
    })

    expect(intervalsOverlap(night.start, night.end, early.start, early.end)).toBe(true)
  })

  it("does not treat identical instants as overlap when they only meet", () => {
    const start = Temporal.Instant.from("2026-09-03T08:00:00Z")
    const mid = Temporal.Instant.from("2026-09-03T16:00:00Z")
    const end = Temporal.Instant.from("2026-09-04T00:00:00Z")

    expect(intervalsOverlap(start, mid, mid, end)).toBe(false)
  })
})
