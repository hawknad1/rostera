import { describe, expect, it } from "vitest"

import { calculateWorkingHours } from "@/modules/scheduling/engine/calculateWorkingHours"
import { makeAssignment } from "@/modules/scheduling/__tests__/helpers"

describe("calculateWorkingHours", () => {
  it("sums Instant durations and supports overnight windows", () => {
    const assignments = [
      makeAssignment({ id: "a1", date: "2026-09-03", staffId: "staff-ama" }),
      makeAssignment({
        id: "a2",
        date: "2026-09-03",
        staffId: "staff-ama",
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
        shiftTypeId: "shift-night",
      }),
      makeAssignment({ id: "a3", date: "2026-09-03", staffId: "staff-kofi" }),
    ]

    expect(calculateWorkingHours({ assignments, staffId: "staff-ama" })).toBe(960)
    expect(
      calculateWorkingHours({
        assignments,
        staffId: "staff-ama",
        startDate: "2026-09-04",
        endDate: "2026-09-04",
      }),
    ).toBe(0)
  })
})
