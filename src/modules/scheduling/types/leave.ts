export const leaveStatuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const

export type LeaveStatus = (typeof leaveStatuses)[number]

export type SchedulingLeavePeriod = {
  staffId: string
  startDate: string
  endDate: string
  status: LeaveStatus
}
