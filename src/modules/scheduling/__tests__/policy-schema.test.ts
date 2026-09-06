import { describe, expect, it } from "vitest"

import {
  schedulingPolicyValuesSchema,
  updateSchedulingPolicyFormSchema,
} from "@/modules/scheduling/schemas/scheduling-policy"
import { DISABLED_SCHEDULING_POLICY } from "@/modules/scheduling/types/scheduling-policy"

function values(overrides: Partial<typeof DISABLED_SCHEDULING_POLICY> = {}) {
  return {
    ...DISABLED_SCHEDULING_POLICY,
    ...overrides,
  }
}

function form(overrides: Record<string, string> = {}) {
  return {
    minimumRestEnabled: "false",
    minimumRestHours: "11",
    maximumWeeklyEnabled: "false",
    maximumWeeklyHours: "40",
    maximumConsecutiveEnabled: "false",
    maximumConsecutiveDays: "6",
    maximumNightEnabled: "false",
    maximumNightShiftsPerWeek: "4",
    maximumWeekendEnabled: "false",
    maximumWeekendShifts: "2",
    ...overrides,
  }
}

describe("schedulingPolicyValuesSchema", () => {
  it("accepts an all-null disabled policy", () => {
    expect(schedulingPolicyValuesSchema.parse(values())).toEqual(DISABLED_SCHEDULING_POLICY)
  })

  it("accepts valid positive thresholds", () => {
    expect(
      schedulingPolicyValuesSchema.parse(
        values({
          minimumRestMinutes: 660,
          maximumWeeklyMinutes: 2400,
          maximumConsecutiveDays: 6,
          maximumNightShiftsPerWeek: 4,
          maximumWeekendShifts: 2,
        }),
      ),
    ).toEqual({
      minimumRestMinutes: 660,
      maximumWeeklyMinutes: 2400,
      maximumConsecutiveDays: 6,
      maximumNightShiftsPerWeek: 4,
      maximumWeekendShifts: 2,
    })
  })

  it("accepts zero for night and weekend limits", () => {
    expect(
      schedulingPolicyValuesSchema.parse(
        values({
          maximumNightShiftsPerWeek: 0,
          maximumWeekendShifts: 0,
        }),
      ),
    ).toMatchObject({
      maximumNightShiftsPerWeek: 0,
      maximumWeekendShifts: 0,
    })
  })

  it("rejects zero for rest, weekly minutes, and consecutive days", () => {
    expect(() => schedulingPolicyValuesSchema.parse(values({ minimumRestMinutes: 0 }))).toThrow()
    expect(() => schedulingPolicyValuesSchema.parse(values({ maximumWeeklyMinutes: 0 }))).toThrow()
    expect(() => schedulingPolicyValuesSchema.parse(values({ maximumConsecutiveDays: 0 }))).toThrow()
  })

  it("rejects negative values", () => {
    expect(() => schedulingPolicyValuesSchema.parse(values({ minimumRestMinutes: -1 }))).toThrow()
    expect(() =>
      schedulingPolicyValuesSchema.parse(values({ maximumNightShiftsPerWeek: -1 })),
    ).toThrow()
    expect(() => schedulingPolicyValuesSchema.parse(values({ maximumWeekendShifts: -2 }))).toThrow()
  })

  it("rejects decimal values", () => {
    expect(() => schedulingPolicyValuesSchema.parse(values({ minimumRestMinutes: 11.5 }))).toThrow()
    expect(() =>
      schedulingPolicyValuesSchema.parse(values({ maximumWeeklyMinutes: 2400.1 })),
    ).toThrow()
    expect(() =>
      schedulingPolicyValuesSchema.parse(values({ maximumConsecutiveDays: 6.2 })),
    ).toThrow()
  })

  it("rejects NaN and infinite values", () => {
    expect(() => schedulingPolicyValuesSchema.parse(values({ minimumRestMinutes: NaN }))).toThrow()
    expect(() =>
      schedulingPolicyValuesSchema.parse(values({ maximumWeeklyMinutes: Infinity })),
    ).toThrow()
    expect(() =>
      schedulingPolicyValuesSchema.parse(values({ maximumConsecutiveDays: -Infinity })),
    ).toThrow()
  })

  it("rejects malformed values", () => {
    expect(() =>
      schedulingPolicyValuesSchema.parse(values({ minimumRestMinutes: "abc" as never })),
    ).toThrow()
    expect(() =>
      schedulingPolicyValuesSchema.parse(values({ maximumWeeklyMinutes: true as never })),
    ).toThrow()
    expect(() =>
      schedulingPolicyValuesSchema.parse(values({ maximumConsecutiveDays: {} as never })),
    ).toThrow()
  })
})

describe("updateSchedulingPolicyFormSchema", () => {
  it("converts enabled hours into minutes and leaves disabled rules null", () => {
    expect(
      updateSchedulingPolicyFormSchema.parse(
        form({
          minimumRestEnabled: "true",
          minimumRestHours: "11",
          maximumWeeklyEnabled: "true",
          maximumWeeklyHours: "40",
        }),
      ),
    ).toEqual({
      ...DISABLED_SCHEDULING_POLICY,
      minimumRestMinutes: 660,
      maximumWeeklyMinutes: 2400,
    })
  })

  it("ignores leftover values when a rule is disabled", () => {
    expect(
      updateSchedulingPolicyFormSchema.parse(
        form({
          minimumRestEnabled: "false",
          minimumRestHours: "99",
        }),
      ).minimumRestMinutes,
    ).toBeNull()
  })

  it("rejects an enabled rule without a whole-number threshold", () => {
    expect(() =>
      updateSchedulingPolicyFormSchema.parse(
        form({
          minimumRestEnabled: "true",
          minimumRestHours: "11.5",
        }),
      ),
    ).toThrow()
  })
})
