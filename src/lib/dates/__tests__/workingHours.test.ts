import { Temporal } from "temporal-polyfill"
import { describe, expect, it } from "vitest"

import { instantDurationMinutes } from "@/lib/dates/workingHours"

describe("instantDurationMinutes", () => {
  it("counts a daytime 08:00–16:00 window as 480 minutes", () => {
    const start = Temporal.Instant.from("2026-09-03T08:00:00Z")
    const end = Temporal.Instant.from("2026-09-03T16:00:00Z")

    expect(instantDurationMinutes(start, end)).toBe(480)
  })

  it("counts an overnight 22:00–06:00 window as 480 minutes", () => {
    const start = Temporal.Instant.from("2026-09-03T22:00:00Z")
    const end = Temporal.Instant.from("2026-09-04T06:00:00Z")

    expect(instantDurationMinutes(start, end)).toBe(480)
  })
})
