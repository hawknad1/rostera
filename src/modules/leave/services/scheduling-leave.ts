import {
  calendarDateRangesOverlap,
  isDateInInclusiveRange,
} from "@/lib/dates/calendar-date"
import type { SchedulingLeavePeriod } from "@/modules/scheduling/types/leave"
import { leaveStatuses, type LeaveStatus } from "@/modules/scheduling/types/leave"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm

type LeaveRow = {
  staffId: string
  startDate: string
  endDate: string
  status: string
  organizationId: string
}

function asLeaveStatus(status: string): LeaveStatus {
  if (leaveStatuses.includes(status as LeaveStatus)) {
    return status as LeaveStatus
  }

  return "PENDING"
}

export function toSchedulingLeavePeriod(row: LeaveRow): SchedulingLeavePeriod {
  return {
    staffId: row.staffId,
    startDate: row.startDate,
    endDate: row.endDate,
    status: asLeaveStatus(row.status),
  }
}

export async function loadApprovedLeaveForAssignment(
  orm: PublicOrm,
  input: {
    organizationId: string
    staffId: string
    date: string
  },
): Promise<SchedulingLeavePeriod[]> {
  const rows = await orm.public.LeaveRequest.where({
    organizationId: input.organizationId,
    staffId: input.staffId,
    status: "APPROVED",
  }).all()

  return rows
    .filter(
      (row) =>
        row.organizationId === input.organizationId &&
        row.staffId === input.staffId &&
        row.status === "APPROVED" &&
        isDateInInclusiveRange(input.date, row.startDate, row.endDate),
    )
    .map(toSchedulingLeavePeriod)
}

export async function loadApprovedLeaveForRoster(
  orm: PublicOrm,
  input: {
    organizationId: string
    staffIds: readonly string[]
    startDate: string
    endDate: string
  },
): Promise<SchedulingLeavePeriod[]> {
  if (input.staffIds.length === 0) {
    return []
  }

  const staffIds = new Set(input.staffIds)
  const rows = await orm.public.LeaveRequest.where({
    organizationId: input.organizationId,
    status: "APPROVED",
  }).all()

  return rows
    .filter(
      (row) =>
        row.organizationId === input.organizationId &&
        row.status === "APPROVED" &&
        staffIds.has(row.staffId) &&
        calendarDateRangesOverlap(
          row.startDate,
          row.endDate,
          input.startDate,
          input.endDate,
        ),
    )
    .map(toSchedulingLeavePeriod)
}

export async function loadApprovedLeaveForStaffIds(
  orm: PublicOrm,
  input: {
    organizationId: string
    staffIds: readonly string[]
  },
): Promise<SchedulingLeavePeriod[]> {
  if (input.staffIds.length === 0) {
    return []
  }

  const staffIds = new Set(input.staffIds)
  const rows = await orm.public.LeaveRequest.where({
    organizationId: input.organizationId,
    status: "APPROVED",
  }).all()

  return rows
    .filter(
      (row) =>
        row.organizationId === input.organizationId &&
        row.status === "APPROVED" &&
        staffIds.has(row.staffId),
    )
    .map(toSchedulingLeavePeriod)
}
