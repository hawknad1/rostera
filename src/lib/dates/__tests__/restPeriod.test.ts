import { Temporal } from "temporal-polyfill"
import { describe, expect, it } from "vitest"

import { restMinutesBetween } from "@/lib/dates/restPeriod"

describe("restMinutesBetween", () => {
  it("measures the gap between a shift end and the next start", () => {
    const previousEnd = Temporal.Instant.from("2026-09-03T16:00:00Z")
    const nextStart = Temporal.Instant.from("2026-09-04T04:00:00Z")

    expect(restMinutesBetween(previousEnd, nextStart)).toBe(720)
  })

  it("returns a negative gap when the next shift starts before the previous ends", () => {
    const previousEnd = Temporal.Instant.from("2026-09-04T06:00:00Z")
    const nextStart = Temporal.Instant.from("2026-09-04T05:00:00Z")

    expect(restMinutesBetween(previousEnd, nextStart)).toBe(-60)
  })
})
