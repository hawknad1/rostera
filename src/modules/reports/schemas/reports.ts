import { z } from "zod"

import { attendanceExceptionTypes, attendanceStatuses } from "@/modules/attendance/types/attendance"
import { leaveTypes } from "@/modules/leave/schemas/leave"
import { leaveStatuses } from "@/modules/scheduling/types/leave"

import { schedulingExceptionBands } from "@/modules/reports/types/filters"

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const optionalDate = z.preprocess(
  emptyToUndefined,
  z.string().regex(CALENDAR_DATE_PATTERN, "Enter a valid date in YYYY-MM-DD format.").optional(),
)

const optionalId = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional())

const optionalPage = z.preprocess((value) => {
  if (value == null || value === "") {
    return undefined
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}, z.number().int().min(1).optional())

export const reportFilterSchema = z.object({
  dateFrom: optionalDate,
  dateTo: optionalDate,
  departmentId: optionalId,
  professionId: optionalId,
  staffId: optionalId,
  shiftTypeId: optionalId,
  rosterSeriesId: optionalId,
  rosterId: optionalId,
  attendanceStatus: z.preprocess((value) => {
    const next = emptyToUndefined(value)
    return attendanceStatuses.includes(next as (typeof attendanceStatuses)[number]) ? next : undefined
  }, z.enum(attendanceStatuses).optional()),
  exceptionType: z.preprocess((value) => {
    const next = emptyToUndefined(value)
    return attendanceExceptionTypes.includes(next as (typeof attendanceExceptionTypes)[number])
      ? next
      : undefined
  }, z.enum(attendanceExceptionTypes).optional()),
  leaveType: z.preprocess((value) => {
    const next = emptyToUndefined(value)
    return leaveTypes.includes(next as (typeof leaveTypes)[number]) ? next : undefined
  }, z.enum(leaveTypes).optional()),
  leaveStatus: z.preprocess((value) => {
    const next = emptyToUndefined(value)
    return leaveStatuses.includes(next as (typeof leaveStatuses)[number]) ? next : undefined
  }, z.enum(leaveStatuses).optional()),
  schedulingSeverity: z.preprocess((value) => {
    const next = emptyToUndefined(value)
    return schedulingExceptionBands.includes(next as (typeof schedulingExceptionBands)[number])
      ? next
      : undefined
  }, z.enum(schedulingExceptionBands).optional()),
  page: optionalPage,
})

export type ReportFilterSchemaInput = z.infer<typeof reportFilterSchema>
