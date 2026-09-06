import { z } from "zod"

import type { SchedulingPolicyValues } from "@/modules/scheduling/types/scheduling-policy"

/** PostgreSQL `integer` / int4 upper bound. Storage constraint, not a labor-policy cap. */
export const POSTGRES_INT_MAX = 2_147_483_647

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

function toNullableInteger(value: unknown) {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length === 0 || trimmed.toLowerCase() === "null") {
      return null
    }

    if (/^-?\d+$/.test(trimmed)) {
      return Number(trimmed)
    }
  }

  return value
}

const finiteInteger = z
  .number("Enter a whole number.")
  .finite("Enter a whole number.")
  .int("Enter a whole number.")
  .max(POSTGRES_INT_MAX, "Value is too large.")

const positiveThreshold = finiteInteger.positive("Enter a value greater than zero.")
const nonNegativeThreshold = finiteInteger.nonnegative("Enter zero or a positive whole number.")

function nullableThreshold(threshold: typeof positiveThreshold | typeof nonNegativeThreshold) {
  return z.preprocess(toNullableInteger, z.union([z.null(), threshold]))
}

export const schedulingPolicyValuesSchema = z.object({
  minimumRestMinutes: nullableThreshold(positiveThreshold),
  maximumWeeklyMinutes: nullableThreshold(positiveThreshold),
  maximumConsecutiveDays: nullableThreshold(positiveThreshold),
  maximumNightShiftsPerWeek: nullableThreshold(nonNegativeThreshold),
  maximumWeekendShifts: nullableThreshold(nonNegativeThreshold),
})

const enabledField = z.preprocess(
  (value) => value === "on" || value === true || value === "true",
  z.boolean(),
)

const optionalWholeNumberText = z.preprocess(emptyToUndefined, z.string().optional())

export const updateSchedulingPolicyFormSchema = z
  .object({
    minimumRestEnabled: enabledField,
    minimumRestHours: optionalWholeNumberText,
    maximumWeeklyEnabled: enabledField,
    maximumWeeklyHours: optionalWholeNumberText,
    maximumConsecutiveEnabled: enabledField,
    maximumConsecutiveDays: optionalWholeNumberText,
    maximumNightEnabled: enabledField,
    maximumNightShiftsPerWeek: optionalWholeNumberText,
    maximumWeekendEnabled: enabledField,
    maximumWeekendShifts: optionalWholeNumberText,
  })
  .superRefine((data, ctx) => {
    assertEnabledWholeNumber(
      data.minimumRestEnabled,
      data.minimumRestHours,
      ctx,
      "minimumRestHours",
      "Enter the minimum rest period in whole hours.",
    )
    assertEnabledWholeNumber(
      data.maximumWeeklyEnabled,
      data.maximumWeeklyHours,
      ctx,
      "maximumWeeklyHours",
      "Enter the maximum weekly working time in whole hours.",
    )
    assertEnabledWholeNumber(
      data.maximumConsecutiveEnabled,
      data.maximumConsecutiveDays,
      ctx,
      "maximumConsecutiveDays",
      "Enter the maximum consecutive working days.",
    )
    assertEnabledWholeNumber(
      data.maximumNightEnabled,
      data.maximumNightShiftsPerWeek,
      ctx,
      "maximumNightShiftsPerWeek",
      "Enter the maximum night shifts per week.",
    )
    assertEnabledWholeNumber(
      data.maximumWeekendEnabled,
      data.maximumWeekendShifts,
      ctx,
      "maximumWeekendShifts",
      "Enter the maximum weekend shifts.",
    )
  })
  .transform((data): SchedulingPolicyValues => {
    return schedulingPolicyValuesSchema.parse({
      minimumRestMinutes: hoursToMinutes(data.minimumRestEnabled, data.minimumRestHours),
      maximumWeeklyMinutes: hoursToMinutes(data.maximumWeeklyEnabled, data.maximumWeeklyHours),
      maximumConsecutiveDays: enabledCount(data.maximumConsecutiveEnabled, data.maximumConsecutiveDays),
      maximumNightShiftsPerWeek: enabledCount(
        data.maximumNightEnabled,
        data.maximumNightShiftsPerWeek,
      ),
      maximumWeekendShifts: enabledCount(data.maximumWeekendEnabled, data.maximumWeekendShifts),
    })
  })

function assertEnabledWholeNumber(
  enabled: boolean,
  value: string | undefined,
  ctx: z.RefinementCtx,
  path: string,
  message: string,
) {
  if (!enabled) {
    return
  }

  if (value === undefined || !/^\d+$/.test(value.trim())) {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message,
    })
  }
}

function hoursToMinutes(enabled: boolean, hours: string | undefined) {
  if (!enabled || hours === undefined || !/^\d+$/.test(hours.trim())) {
    return null
  }

  return Number(hours) * 60
}

function enabledCount(enabled: boolean, value: string | undefined) {
  if (!enabled || value === undefined || !/^\d+$/.test(value.trim())) {
    return null
  }

  return Number(value)
}

export type SchedulingPolicyValuesInput = z.output<typeof schedulingPolicyValuesSchema>
export type UpdateSchedulingPolicyFormInput = z.input<typeof updateSchedulingPolicyFormSchema>
