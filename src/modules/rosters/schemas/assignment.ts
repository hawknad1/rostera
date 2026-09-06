import { z } from "zod"

import { CalendarDateError, parseCalendarDate } from "@/lib/dates/calendar-date"

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const requiredId = (label: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string(`${label} is required.`).trim().min(1, `${label} is required.`),
  )

const assignmentDateField = z.preprocess(
  emptyToUndefined,
  z
    .string("Date is required.")
    .trim()
    .min(1, "Date is required.")
    .transform((value, ctx) => {
      try {
        return parseCalendarDate(value).toString()
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message:
            error instanceof CalendarDateError
              ? error.message
              : "Enter a valid date in YYYY-MM-DD format.",
        })
        return z.NEVER
      }
    }),
)

export const createAssignmentInputSchema = z.object({
  rosterId: requiredId("Roster"),
  date: assignmentDateField,
  shiftTypeId: requiredId("Shift"),
  staffId: requiredId("Staff member"),
})

export const assignmentIdInputSchema = z.object({
  id: z.string().trim().min(1, "Assignment is required."),
})

export type CreateAssignmentInput = z.output<typeof createAssignmentInputSchema>
export type AssignmentIdInput = z.output<typeof assignmentIdInputSchema>
