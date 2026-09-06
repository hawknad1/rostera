import { z } from "zod"

import { describeShiftDuration, parseShiftTime, ShiftTimeError } from "@/lib/dates/shift-time"

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const optionalDescription = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).max(500, "Description is too long.").optional(),
)

const requiredName = z.preprocess(
  emptyToUndefined,
  z
    .string("Shift name is required.")
    .trim()
    .min(1, "Shift name is required.")
    .max(80, "Shift name is too long."),
)

function shiftTimeField(label: string) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string(`${label} is required.`)
      .trim()
      .min(1, `${label} is required.`)
      .transform((value, ctx) => {
        try {
          return parseShiftTime(value).formatted
        } catch (error) {
          ctx.addIssue({
            code: "custom",
            message:
              error instanceof ShiftTimeError
                ? error.message
                : `Enter a valid ${label.toLowerCase()} in 24-hour HH:mm format.`,
          })
          return z.NEVER
        }
      }),
  )
}

const isOvernightField = z.preprocess(
  (value) => value === "on" || value === true || value === "true",
  z.boolean(),
)

export const createShiftTypeInputSchema = z
  .object({
    name: requiredName,
    description: optionalDescription,
    startTime: shiftTimeField("Start time"),
    endTime: shiftTimeField("End time"),
    isOvernight: isOvernightField,
  })
  .superRefine((data, ctx) => {
    try {
      describeShiftDuration(data)
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: error instanceof Error ? error.message : "Enter a valid shift window.",
      })
    }
  })

export const updateShiftTypeInputSchema = createShiftTypeInputSchema.extend({
  id: z.string().trim().min(1, "Shift is required."),
})

export const shiftTypeIdInputSchema = z.object({
  id: z.string().trim().min(1, "Shift is required."),
})

export type CreateShiftTypeInput = z.output<typeof createShiftTypeInputSchema>
export type UpdateShiftTypeInput = z.output<typeof updateShiftTypeInputSchema>
export type ShiftTypeIdInput = z.output<typeof shiftTypeIdInputSchema>
