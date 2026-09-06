import { describe, expect, it } from "vitest"

import { detectConflicts } from "@/modules/scheduling/engine/detectConflicts"
import { validateAssignment } from "@/modules/scheduling/engine/validateAssignment"
import { toSchedulingConfig } from "@/modules/scheduling/policy/to-scheduling-config"
import { DISABLED_SCHEDULING_POLICY } from "@/modules/scheduling/types/scheduling-policy"
import { makeAssignment, makeContext } from "@/modules/scheduling/__tests__/helpers"

function policyConfig(
  overrides: Partial<typeof DISABLED_SCHEDULING_POLICY> = {},
) {
  return toSchedulingConfig({
    ...DISABLED_SCHEDULING_POLICY,
    ...overrides,
  })
}

describe("scheduling policy semantics", () => {
  it("does not generate a minimum-rest conflict when the rule is disabled", () => {
    const result = validateAssignment(
      makeContext({
        assignments: [
          makeAssignment({
            id: "a1",
            date: "2026-09-03",
            startTime: "08:00",
            endTime: "16:00",
          }),
        ],
        config: policyConfig({ minimumRestMinutes: null }),
      }),
      makeAssignment({
        date: "2026-09-04",
        startTime: "02:00",
        endTime: "10:00",
        shiftTypeId: "shift-early",
      }),
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "INSUFFICIENT_REST")).toEqual([])
  })

  it("generates a minimum-rest conflict when the configured threshold is violated", () => {
    const result = validateAssignment(
      makeContext({
        assignments: [
          makeAssignment({
            id: "a1",
            date: "2026-09-03",
            startTime: "08:00",
            endTime: "16:00",
          }),
        ],
        config: policyConfig({ minimumRestMinutes: 720 }),
      }),
      makeAssignment({
        date: "2026-09-04",
        startTime: "02:00",
        endTime: "10:00",
        shiftTypeId: "shift-early",
      }),
    )

    expect(result.valid).toBe(false)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INSUFFICIENT_REST",
          blocking: true,
        }),
      ]),
    )
  })

  it("allows weekly hours at the configured limit and flags hours above it", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
      makeAssignment({ id: "a3", date: "2026-09-02" }),
      makeAssignment({ id: "a4", date: "2026-09-03" }),
      makeAssignment({ id: "a5", date: "2026-09-04" }),
    ]

    const passing = validateAssignment(
      makeContext({
        assignments: existing,
        config: policyConfig({ maximumWeeklyMinutes: 2880 }),
      }),
      makeAssignment({ date: "2026-09-05" }),
    )
    const failing = validateAssignment(
      makeContext({
        assignments: [...existing, makeAssignment({ id: "a6", date: "2026-09-05" })],
        config: policyConfig({ maximumWeeklyMinutes: 2880 }),
      }),
      makeAssignment({ date: "2026-09-06" }),
    )

    expect(passing.conflicts.filter((conflict) => conflict.code === "MAXIMUM_HOURS_EXCEEDED")).toEqual(
      [],
    )
    expect(failing.valid).toBe(false)
    expect(failing.conflicts.some((conflict) => conflict.code === "MAXIMUM_HOURS_EXCEEDED")).toBe(
      true,
    )
  })

  it("does not generate a weekly-hours conflict when the rule is disabled", () => {
    const result = detectConflicts(
      makeContext({
        assignments: [
          makeAssignment({ id: "a1", date: "2026-08-31" }),
          makeAssignment({ id: "a2", date: "2026-09-01" }),
          makeAssignment({ id: "a3", date: "2026-09-02" }),
          makeAssignment({ id: "a4", date: "2026-09-03" }),
          makeAssignment({ id: "a5", date: "2026-09-04" }),
          makeAssignment({ id: "a6", date: "2026-09-05" }),
          makeAssignment({ id: "a7", date: "2026-09-06" }),
        ],
        config: policyConfig({ maximumWeeklyMinutes: null }),
      }),
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "MAXIMUM_HOURS_EXCEEDED")).toEqual(
      [],
    )
  })

  it("flags consecutive assignment dates above the limit and ignores overnight span into the next calendar day", () => {
    const existing = [
      makeAssignment({ id: "a1", date: "2026-08-31" }),
      makeAssignment({ id: "a2", date: "2026-09-01" }),
      makeAssignment({
        id: "a3",
        date: "2026-09-02",
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
        shiftTypeId: "shift-night",
      }),
    ]

    const passing = validateAssignment(
      makeContext({
        assignments: existing,
        config: policyConfig({ maximumConsecutiveDays: 4 }),
      }),
      makeAssignment({ date: "2026-09-03" }),
    )
    const failing = validateAssignment(
      makeContext({
        assignments: [...existing, makeAssignment({ id: "a4", date: "2026-09-03" })],
        config: policyConfig({ maximumConsecutiveDays: 4 }),
      }),
      makeAssignment({ date: "2026-09-04" }),
    )

    expect(
      passing.conflicts.filter((conflict) => conflict.code === "CONSECUTIVE_SHIFT_LIMIT"),
    ).toEqual([])
    expect(failing.valid).toBe(false)
    expect(failing.conflicts.some((conflict) => conflict.code === "CONSECUTIVE_SHIFT_LIMIT")).toBe(
      true,
    )
  })

  it("treats a night-shift limit of zero as enabled and blocking", () => {
    const result = validateAssignment(
      makeContext({
        config: policyConfig({ maximumNightShiftsPerWeek: 0 }),
      }),
      makeAssignment({
        date: "2026-09-03",
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
        shiftTypeId: "shift-night",
      }),
    )

    expect(result.valid).toBe(false)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "NIGHT_SHIFT_LIMIT",
          blocking: true,
          severity: "ERROR",
        }),
      ]),
    )
  })

  it("does not count a non-overnight shift toward the night-shift policy", () => {
    const result = validateAssignment(
      makeContext({
        config: policyConfig({ maximumNightShiftsPerWeek: 0 }),
      }),
      makeAssignment({ date: "2026-09-03" }),
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "NIGHT_SHIFT_LIMIT")).toEqual([])
  })

  it("treats a weekend-shift limit of zero as enabled and blocking", () => {
    const result = validateAssignment(
      makeContext({
        config: policyConfig({ maximumWeekendShifts: 0 }),
      }),
      makeAssignment({ date: "2026-09-05" }),
    )

    expect(result.valid).toBe(false)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "WEEKEND_LIMIT",
          blocking: true,
        }),
      ]),
    )
  })

  it("allows two weekend shifts when the weekend limit is two", () => {
    const result = validateAssignment(
      makeContext({
        assignments: [makeAssignment({ id: "a1", date: "2026-09-05" })],
        config: policyConfig({ maximumWeekendShifts: 2 }),
      }),
      makeAssignment({ date: "2026-09-06" }),
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "WEEKEND_LIMIT")).toEqual([])
  })

  it("does not generate weekend conflicts when the weekend rule is disabled", () => {
    const result = validateAssignment(
      makeContext({
        assignments: [
          makeAssignment({ id: "a1", date: "2026-09-05" }),
          makeAssignment({
            id: "a2",
            date: "2026-09-05",
            startTime: "16:00",
            endTime: "22:00",
            shiftTypeId: "shift-late",
          }),
        ],
        config: policyConfig({ maximumWeekendShifts: null }),
      }),
      makeAssignment({ date: "2026-09-06" }),
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "WEEKEND_LIMIT")).toEqual([])
  })
})
