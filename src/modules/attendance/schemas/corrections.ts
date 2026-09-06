import { z } from "zod"

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const instant = z
  .string("Enter a valid date and time.")
  .trim()
  .min(1, "Enter a valid date and time.")

export const correctAttendanceInputSchema = z
  .object({
    id: z.string().trim().min(1, "Attendance record is required."),
    clockIn: z.preprocess(emptyToUndefined, instant.optional()),
    clockOut: z.preprocess(emptyToUndefined, instant.optional()),
    reason: z
      .string("A reason is required to correct attendance.")
      .trim()
      .min(1, "A reason is required to correct attendance.")
      .max(2000, "Reason must be 2000 characters or fewer."),
  })
  .refine((value) => Boolean(value.clockIn || value.clockOut), {
    message: "Enter a clock-in or clock-out time.",
    path: ["clockOut"],
  })

export const reviewAttendanceInputSchema = z.object({
  id: z.string().trim().min(1, "Attendance record is required."),
  decision: z.enum(["APPROVE", "REJECT", "VOID"]),
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(2000, "Notes must be 2000 characters or fewer.").optional(),
  ),
})

export const updateAttendancePolicyFormSchema = z.object({
  attendanceEnabled: z.enum(["on", "off"]).default("on"),
  allowUnscheduledAttendance: z.enum(["on", "off"]).default("on"),
  allowEarlyClockIn: z.enum(["on", "off"]).default("on"),
  lateThresholdMinutes: z.coerce.number().int().min(0).max(24 * 60),
  earlyDepartureThresholdMinutes: z.coerce.number().int().min(0).max(24 * 60),
  overtimeThresholdMinutes: z.coerce.number().int().min(0).max(24 * 60),
  maximumEarlyClockInMinutes: z.coerce.number().int().min(0).max(24 * 60),
  maximumLateClockOutMinutes: z.coerce.number().int().min(0).max(7 * 24 * 60),
})

export type CorrectAttendanceInput = z.output<typeof correctAttendanceInputSchema>
export type ReviewAttendanceInput = z.output<typeof reviewAttendanceInputSchema>
export type UpdateAttendancePolicyFormInput = z.output<typeof updateAttendancePolicyFormSchema>
