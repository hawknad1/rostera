import { z } from "zod"

import {
  CalendarDateError,
  assertValidDateRange,
  parseCalendarDate,
} from "@/lib/dates/calendar-date"

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const requiredName = z.preprocess(
  emptyToUndefined,
  z
    .string("Roster name is required.")
    .trim()
    .min(1, "Roster name is required.")
    .max(120, "Roster name is too long."),
)

const calendarDateField = (label: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string(`${label} is required.`)
      .trim()
      .min(1, `${label} is required.`)
      .transform((value, ctx) => {
        try {
          return parseCalendarDate(value).toString()
        } catch (error) {
          ctx.addIssue({
            code: "custom",
            message:
              error instanceof CalendarDateError
                ? error.message
                : `Enter a valid ${label.toLowerCase()} in YYYY-MM-DD format.`,
          })
          return z.NEVER
        }
      }),
  )

export const createRosterInputSchema = z
  .object({
    name: requiredName,
    departmentId: z.preprocess(
      emptyToUndefined,
      z.string("Department is required.").trim().min(1, "Department is required."),
    ),
    startDate: calendarDateField("Start date"),
    endDate: calendarDateField("End date"),
  })
  .superRefine((data, ctx) => {
    try {
      assertValidDateRange(data.startDate, data.endDate)
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message:
          error instanceof CalendarDateError
            ? error.message
            : "The start date must be on or before the end date.",
      })
    }
  })

export const updateRosterInputSchema = z
  .object({
    id: z.string().trim().min(1, "Roster is required."),
    name: requiredName,
    startDate: calendarDateField("Start date"),
    endDate: calendarDateField("End date"),
  })
  .superRefine((data, ctx) => {
    try {
      assertValidDateRange(data.startDate, data.endDate)
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message:
          error instanceof CalendarDateError
            ? error.message
            : "The start date must be on or before the end date.",
      })
    }
  })

export const rosterIdInputSchema = z.object({
  id: z.string().trim().min(1, "Roster is required."),
})

export const AMENDMENT_REASON_MAX_LENGTH = 280

export const createRosterAmendmentInputSchema = z.object({
  rosterId: z.preprocess(
    emptyToUndefined,
    z.string("Roster is required.").trim().min(1, "Roster is required."),
  ),
  reason: z.preprocess(
    emptyToUndefined,
    z
      .string("Amendment reason is required.")
      .trim()
      .min(1, "Amendment reason is required.")
      .max(AMENDMENT_REASON_MAX_LENGTH, "Amendment reason is too long."),
  ),
})

export type CreateRosterInput = z.output<typeof createRosterInputSchema>
export type UpdateRosterInput = z.output<typeof updateRosterInputSchema>
export type RosterIdInput = z.output<typeof rosterIdInputSchema>
export type CreateRosterAmendmentInput = z.output<typeof createRosterAmendmentInputSchema>
