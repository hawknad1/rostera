import type { LeaveStatus } from "@/modules/scheduling/types/leave"
import type { LeaveType } from "@/modules/leave/schemas/leave"

export const leaveStatusLabels: Record<LeaveStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

export const leaveTypeLabels: Record<LeaveType, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  STUDY: "Study",
  COMPASSIONATE: "Compassionate",
  OTHER: "Other",
}

export function formatLeaveDuration(days: number) {
  return days === 1 ? "1 day" : `${days} days`
}
