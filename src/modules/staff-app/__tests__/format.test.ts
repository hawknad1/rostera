import { Temporal } from "temporal-polyfill"
import { describe, expect, it } from "vitest"

import {
  greetingForHour,
  offlineBannerText,
  relativeDayLabel,
  formatTimeWindow,
} from "@/modules/staff-app/format"

describe("staff format helpers", () => {
  const now = Temporal.Instant.from("2026-09-10T12:00:00Z")

  it("uses organization-relative day labels", () => {
    expect(relativeDayLabel("2026-09-10", "Africa/Accra", now)).toBe("Today")
    expect(relativeDayLabel("2026-09-11", "Africa/Accra", now)).toBe("Tomorrow")
  })

  it("labels overnight windows without splitting the shift", () => {
    expect(formatTimeWindow("22:00", "06:00", true)).toBe("22:00–06:00 · overnight")
  })

  it("builds an offline stale-data banner", () => {
    expect(greetingForHour(8)).toBe("Good morning")
    expect(offlineBannerText("2026-09-06T10:42:00Z", "UTC")).toContain("Offline")
    expect(offlineBannerText("2026-09-06T10:42:00Z", "UTC")).toContain("10:42")
  })
})
