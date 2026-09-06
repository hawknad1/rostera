import { describe, expect, it } from "vitest"

import { validateAssignment } from "@/modules/scheduling/engine/validateAssignment"
import { makeAssignment, makeContext } from "@/modules/scheduling/__tests__/helpers"

describe("rest period rule", () => {
  it("allows a gap that equals the configured minimum rest", () => {
    const existing = makeAssignment({
      id: "a1",
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
    })
    const candidate = makeAssignment({
      date: "2026-09-04",
      startTime: "04:00",
      endTime: "12:00",
      shiftTypeId: "shift-early",
    })

    const result = validateAssignment(
      makeContext({
        assignments: [existing],
        config: { minimumRestMinutes: 720 },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "INSUFFICIENT_REST")).toEqual([])
  })

  it("flags a gap below the configured minimum rest", () => {
    const existing = makeAssignment({
      id: "a1",
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
    })
    const candidate = makeAssignment({
      date: "2026-09-04",
      startTime: "02:00",
      endTime: "10:00",
      shiftTypeId: "shift-early",
    })

    const result = validateAssignment(
      makeContext({
        assignments: [existing],
        config: { minimumRestMinutes: 720 },
      }),
      candidate,
    )

    expect(result.valid).toBe(false)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INSUFFICIENT_REST",
          severity: "ERROR",
          blocking: true,
        }),
      ]),
    )
  })

  it("calculates rest from an overnight previous shift using Instant end", () => {
    const existing = makeAssignment({
      id: "a1",
      date: "2026-09-03",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      shiftTypeId: "shift-night",
    })
    const candidate = makeAssignment({
      date: "2026-09-04",
      startTime: "16:00",
      endTime: "00:00",
      isOvernight: true,
      shiftTypeId: "shift-evening",
    })

    const allowed = validateAssignment(
      makeContext({
        assignments: [existing],
        config: { minimumRestMinutes: 600 },
      }),
      candidate,
    )
    const blocked = validateAssignment(
      makeContext({
        assignments: [existing],
        config: { minimumRestMinutes: 720 },
      }),
      candidate,
    )

    expect(allowed.conflicts.filter((conflict) => conflict.code === "INSUFFICIENT_REST")).toEqual([])
    expect(blocked.conflicts.some((conflict) => conflict.code === "INSUFFICIENT_REST")).toBe(true)
  })
})

describe("maximum hours rule", () => {
  it("allows scheduled time under the weekly limit", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
    ]
    const candidate = makeAssignment({ date: "2026-09-02" })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { maximumWeeklyMinutes: 2880 },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "MAXIMUM_HOURS_EXCEEDED")).toEqual(
      [],
    )
  })

  it("allows scheduled time that exactly meets the weekly limit", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
      makeAssignment({ id: "a3", date: "2026-09-02" }),
      makeAssignment({ id: "a4", date: "2026-09-03" }),
      makeAssignment({ id: "a5", date: "2026-09-04" }),
    ]
    const candidate = makeAssignment({ date: "2026-09-05" })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { maximumWeeklyMinutes: 2880 },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "MAXIMUM_HOURS_EXCEEDED")).toEqual(
      [],
    )
  })

  it("flags scheduled time over the weekly limit", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
      makeAssignment({ id: "a3", date: "2026-09-02" }),
      makeAssignment({ id: "a4", date: "2026-09-03" }),
      makeAssignment({ id: "a5", date: "2026-09-04" }),
      makeAssignment({ id: "a6", date: "2026-09-05" }),
    ]
    const candidate = makeAssignment({ date: "2026-09-06" })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { maximumWeeklyMinutes: 2880 },
      }),
      candidate,
    )

    expect(result.valid).toBe(false)
    expect(result.conflicts.some((conflict) => conflict.code === "MAXIMUM_HOURS_EXCEEDED")).toBe(true)
  })

  it("counts overnight hours from Instant duration", () => {
    const existing = [
      makeAssignment({
        id: "a1",
        date: "2026-08-31",
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
        shiftTypeId: "shift-night",
      }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
      makeAssignment({ id: "a3", date: "2026-09-02" }),
      makeAssignment({ id: "a4", date: "2026-09-03" }),
      makeAssignment({ id: "a5", date: "2026-09-04" }),
    ]
    const candidate = makeAssignment({ date: "2026-09-05" })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { maximumWeeklyMinutes: 2880 },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "MAXIMUM_HOURS_EXCEEDED")).toEqual(
      [],
    )
  })

  it("does not count assignments outside the ISO week", () => {
    const previousWeek = makeAssignment({
      id: "a0",
      date: "2026-08-30",
    })
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
      makeAssignment({ id: "a3", date: "2026-09-02" }),
      makeAssignment({ id: "a4", date: "2026-09-03" }),
      makeAssignment({ id: "a5", date: "2026-09-04" }),
    ]
    const candidate = makeAssignment({ date: "2026-09-05" })

    const result = validateAssignment(
      makeContext({
        assignments: [previousWeek, ...existing],
        config: { maximumWeeklyMinutes: 2880 },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "MAXIMUM_HOURS_EXCEEDED")).toEqual(
      [],
    )
  })
})

describe("consecutive shifts rule", () => {
  it("allows three consecutive days under the limit", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
    ]
    const candidate = makeAssignment({ date: "2026-09-02" })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { maximumConsecutiveDays: 6 },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "CONSECUTIVE_SHIFT_LIMIT")).toEqual(
      [],
    )
  })

  it("allows a run that exactly meets the maximum", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
      makeAssignment({ id: "a3", date: "2026-09-02" }),
      makeAssignment({ id: "a4", date: "2026-09-03" }),
      makeAssignment({ id: "a5", date: "2026-09-04" }),
    ]
    const candidate = makeAssignment({ date: "2026-09-05" })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { maximumConsecutiveDays: 6 },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "CONSECUTIVE_SHIFT_LIMIT")).toEqual(
      [],
    )
  })

  it("flags a run that exceeds the maximum", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
      makeAssignment({ id: "a3", date: "2026-09-02" }),
      makeAssignment({ id: "a4", date: "2026-09-03" }),
      makeAssignment({ id: "a5", date: "2026-09-04" }),
      makeAssignment({ id: "a6", date: "2026-09-05" }),
    ]
    const candidate = makeAssignment({ date: "2026-09-06" })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { maximumConsecutiveDays: 6 },
      }),
      candidate,
    )

    expect(result.valid).toBe(false)
    expect(result.conflicts.some((conflict) => conflict.code === "CONSECUTIVE_SHIFT_LIMIT")).toBe(true)
  })

  it("treats a missing calendar day as a break in the run", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
    ]
    const candidate = makeAssignment({ date: "2026-09-03" })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { maximumConsecutiveDays: 2 },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "CONSECUTIVE_SHIFT_LIMIT")).toEqual(
      [],
    )
  })

  it("counts multiple assignments on the same date as one day", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-09-03", startTime: "08:00", endTime: "12:00" }),
      makeAssignment({
        id: "a2",
        date: "2026-09-03",
        startTime: "12:00",
        endTime: "16:00",
        shiftTypeId: "shift-late",
      }),
      makeAssignment({ id: "a3", date: "2026-09-04" }),
    ]
    const candidate = makeAssignment({ date: "2026-09-05" })

    const result = validateAssignment(
      makeContext({
        assignments: existing,
        config: { maximumConsecutiveDays: 3 },
      }),
      candidate,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "CONSECUTIVE_SHIFT_LIMIT")).toEqual(
      [],
    )
  })
})
