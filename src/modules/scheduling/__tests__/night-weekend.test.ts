import { describe, expect, it } from "vitest"

import { validateAssignment } from "@/modules/scheduling/engine/validateAssignment"
import { makeAssignment, makeContext } from "@/modules/scheduling/__tests__/helpers"

describe("night shift limit rule", () => {
  it("respects the configured weekly night-shift limit", () => {
    const existing = [
      makeAssignment({
        id: "a1",
        date: "2026-08-31",
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
        shiftTypeId: "shift-night",
      }),
      makeAssignment({
        id: "a2",
        date: "2026-09-02",
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
        shiftTypeId: "shift-night",
      }),
    ]
    const candidate = makeAssignment({
      date: "2026-09-04",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      shiftTypeId: "shift-night",
    })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { nightShiftLimit: { maximumPerWeek: 3, constraint: "SOFT" } },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "NIGHT_SHIFT_LIMIT")).toEqual([])
  })

  it("flags exceeding the night-shift limit", () => {
    const existing = [
      makeAssignment({
        id: "a1",
        date: "2026-08-31",
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
        shiftTypeId: "shift-night",
      }),
      makeAssignment({
        id: "a2",
        date: "2026-09-02",
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
        shiftTypeId: "shift-night",
      }),
      makeAssignment({
        id: "a3",
        date: "2026-09-03",
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
        shiftTypeId: "shift-night",
      }),
    ]
    const candidate = makeAssignment({
      date: "2026-09-05",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      shiftTypeId: "shift-night",
    })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { nightShiftLimit: { maximumPerWeek: 3, constraint: "SOFT" } },
      }),
      candidate,
    )

    expect(result.valid).toBe(true)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "NIGHT_SHIFT_LIMIT",
          severity: "WARNING",
          blocking: false,
        }),
      ]),
    )
  })

  it("does not count non-overnight shifts as night shifts", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
      makeAssignment({ id: "a3", date: "2026-09-02" }),
    ]
    const candidate = makeAssignment({
      date: "2026-09-03",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      shiftTypeId: "shift-night",
    })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { nightShiftLimit: { maximumPerWeek: 1, constraint: "SOFT" } },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "NIGHT_SHIFT_LIMIT")).toEqual([])
  })

  it("counts a shift only when isOvernight is true", () => {
    const existing = makeAssignment({
      id: "a1",
      date: "2026-09-01",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      shiftTypeId: "late-cover",
    })
    const candidate = makeAssignment({
      date: "2026-09-03",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      shiftTypeId: "late-cover",
    })

    const result = validateAssignment(
      makeContext({
        assignments: [existing],
        config: { nightShiftLimit: { maximumPerWeek: 1, constraint: "HARD" } },
      }),
      candidate,
    )

    expect(result.valid).toBe(false)
    expect(result.conflicts.some((conflict) => conflict.code === "NIGHT_SHIFT_LIMIT")).toBe(true)
  })
})

describe("weekend limit rule", () => {
  it("does not count a weekday assignment", () => {
    const result = validateAssignment(
      makeContext({
        config: { weekendLimit: { maximumShifts: 1, constraint: "SOFT" } },
      }),
      makeAssignment({ date: "2026-09-03" }),
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "WEEKEND_LIMIT")).toEqual([])
  })

  it("counts Saturday", () => {
    const result = validateAssignment(
      makeContext({
        assignments: [makeAssignment({ id: "a1", date: "2026-09-06" })],
        config: { weekendLimit: { maximumShifts: 1, constraint: "SOFT" } },
      }),
      makeAssignment({ date: "2026-09-05" }),
    )

    expect(result.conflicts.some((conflict) => conflict.code === "WEEKEND_LIMIT")).toBe(true)
  })

  it("counts Sunday", () => {
    const result = validateAssignment(
      makeContext({
        assignments: [makeAssignment({ id: "a1", date: "2026-09-05" })],
        config: { weekendLimit: { maximumShifts: 1, constraint: "SOFT" } },
      }),
      makeAssignment({ date: "2026-09-06" }),
    )

    expect(result.conflicts.some((conflict) => conflict.code === "WEEKEND_LIMIT")).toBe(true)
  })

  it("respects the weekend-shift limit", () => {
    const result = validateAssignment(
      makeContext({
        assignments: [makeAssignment({ id: "a1", date: "2026-09-05" })],
        config: { weekendLimit: { maximumShifts: 2, constraint: "SOFT" } },
      }),
      makeAssignment({ date: "2026-09-06" }),
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "WEEKEND_LIMIT")).toEqual([])
  })

  it("flags exceeding the weekend-shift limit", () => {
    const result = validateAssignment(
      makeContext({
        assignments: [
          makeAssignment({
            id: "a1",
            date: "2026-09-05",
            startTime: "08:00",
            endTime: "12:00",
          }),
          makeAssignment({
            id: "a2",
            date: "2026-09-05",
            startTime: "12:00",
            endTime: "16:00",
            shiftTypeId: "shift-late",
          }),
        ],
        config: { weekendLimit: { maximumShifts: 2, constraint: "SOFT" } },
      }),
      makeAssignment({ date: "2026-09-06" }),
    )

    expect(result.valid).toBe(true)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "WEEKEND_LIMIT",
          severity: "WARNING",
          blocking: false,
        }),
      ]),
    )
  })
})
