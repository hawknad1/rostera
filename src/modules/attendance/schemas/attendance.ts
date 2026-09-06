import { z } from "zod"

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const calendarDate = z
  .string("Enter a valid date.")
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date in YYYY-MM-DD format.")

export const attendanceListFilterSchema = z.object({
  date: z.preprocess(emptyToUndefined, calendarDate.optional()),
  departmentId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  staffId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  status: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  exceptionType: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
})

export const attendanceIdInputSchema = z.object({
  id: z.string().trim().min(1, "Attendance record is required."),
})

export const missingAttendanceFilterSchema = z.object({
  date: z.preprocess(emptyToUndefined, calendarDate.optional()),
  departmentId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  shiftTypeId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
})

export type AttendanceListFilterInput = z.output<typeof attendanceListFilterSchema>
export type MissingAttendanceFilterInput = z.output<typeof missingAttendanceFilterSchema>
