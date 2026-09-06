import { z } from "zod"

export const leaveTypes = [
  "ANNUAL",
  "SICK",
  "MATERNITY",
  "PATERNITY",
  "STUDY",
  "COMPASSIONATE",
  "OTHER",
] as const

export type LeaveType = (typeof leaveTypes)[number]

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const optionalNotes = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).max(2000, "Notes must be 2000 characters or fewer.").optional(),
)

const calendarDate = z
  .string("Enter a valid date.")
  .trim()
  .regex(CALENDAR_DATE_PATTERN, "Enter a valid date in YYYY-MM-DD format.")

export const createLeaveInputSchema = z
  .object({
    staffId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
    leaveType: z.enum(leaveTypes, "Leave type is required."),
    startDate: calendarDate,
    endDate: calendarDate,
    notes: optionalNotes,
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "The start date must be on or before the end date.",
    path: ["endDate"],
  })

export const leaveIdInputSchema = z.object({
  id: z.string().trim().min(1, "Leave request is required."),
})

export type CreateLeaveInput = z.output<typeof createLeaveInputSchema>
export type LeaveIdInput = z.output<typeof leaveIdInputSchema>
