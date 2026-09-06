import type { Temporal } from "temporal-polyfill"

export const leaveStatuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const

export type LeaveStatus = (typeof leaveStatuses)[number]

export type SchedulingLeavePeriod = {
  staffId: string
  start: Temporal.Instant
  end: Temporal.Instant
  status: LeaveStatus
}
