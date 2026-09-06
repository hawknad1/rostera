import type { CoverageStatus } from "@/modules/scheduling/engine/calculateCoverage"
import type { AttendanceStatus } from "@/modules/attendance/types/attendance"
import type { LeaveType } from "@/modules/leave/schemas/leave"
import type { LeaveStatus } from "@/modules/scheduling/types/leave"
import { attendanceStatusLabels } from "@/modules/attendance/labels"
import { leaveStatusLabels, leaveTypeLabels } from "@/modules/leave/labels"
import type { SchedulingExceptionBand } from "@/modules/reports/types/filters"
import { schedulingConflictCodes } from "@/modules/scheduling/types/scheduling-conflict"

export const coverageStatusLabels: Record<CoverageStatus | "no_requirement", string> = {
  understaffed: "Under-covered",
  covered: "Fully covered",
  overstaffed: "Over-covered",
  no_requirement: "No requirement",
}

export const schedulingExceptionBandLabels: Record<SchedulingExceptionBand, string> = {
  BLOCKING: "Blocking",
  WARNING: "Warning",
  INFO: "Info",
}

export const schedulingConflictLabels: Record<(typeof schedulingConflictCodes)[number], string> = {
  ASSIGNMENT_OVERLAP: "Overlapping assignments",
  LEAVE_CONFLICT: "Leave conflict",
  INSUFFICIENT_REST: "Minimum rest",
  MAXIMUM_HOURS_EXCEEDED: "Weekly hours",
  CONSECUTIVE_SHIFT_LIMIT: "Consecutive days",
  QUALIFICATION_MISMATCH: "Qualification",
  STAFFING_SHORTFALL: "Staffing shortfall",
  STAFFING_OVERSTAFFED: "Overstaffing",
  NIGHT_SHIFT_LIMIT: "Night shift limit",
  WEEKEND_LIMIT: "Weekend limit",
}

export function formatRate(percent: number | null, empty = "No data") {
  if (percent == null) {
    return empty
  }

  return `${percent}%`
}

export function formatHours(hours: number | null | undefined) {
  if (hours == null) {
    return "—"
  }

  return String(hours)
}

export function formatCoverageStatus(status: CoverageStatus | "no_requirement") {
  return coverageStatusLabels[status]
}

export function leaveTypeLabel(type: LeaveType) {
  return leaveTypeLabels[type]
}

export function leaveStatusLabel(status: LeaveStatus) {
  return leaveStatusLabels[status]
}

export function attendanceStatusLabel(status: AttendanceStatus) {
  return attendanceStatusLabels[status]
}
