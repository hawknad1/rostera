import { parseCalendarDate } from "@/lib/dates/calendar-date"
import { leaveTypeLabels } from "@/modules/leave/labels"
import type { LeaveType } from "@/modules/leave/schemas/leave"
import type { DomainNotificationEvent } from "@/modules/notifications/types/notification"

export function compactDateRange(startDate: string, endDate: string) {
  const start = parseCalendarDate(startDate)
  const end = parseCalendarDate(endDate)
  const month = start.toLocaleString("en-US", { month: "short" })

  if (startDate === endDate) {
    return `${month} ${start.day}`
  }

  if (start.year === end.year && start.month === end.month) {
    return `${month} ${start.day}–${end.day}`
  }

  const endMonth = end.toLocaleString("en-US", { month: "short" })
  return `${month} ${start.day} – ${endMonth} ${end.day}`
}

export function rosterDateRange(startDate: string, endDate: string) {
  const start = parseCalendarDate(startDate)
  const end = parseCalendarDate(endDate)

  if (start.year === end.year && start.month === end.month) {
    return `${start.toLocaleString("en-US", { month: "long" })} ${start.day}–${end.day}`
  }

  return `${start.toLocaleString("en-US", { month: "long", day: "numeric" })} – ${end.toLocaleString("en-US", { month: "long", day: "numeric" })}`
}

export function leaveTypePhrase(leaveType: LeaveType) {
  return leaveTypeLabels[leaveType].toLowerCase()
}

export function notificationCopy(event: DomainNotificationEvent): { title: string; body: string } {
  switch (event.type) {
    case "LEAVE_REQUESTED":
      return {
        title: "Leave requested",
        body: `${event.staffName} requested ${event.leaveTypeLabel} leave for ${compactDateRange(event.startDate, event.endDate)}.`,
      }
    case "LEAVE_APPROVED":
      return {
        title: "Leave approved",
        body: `Your ${event.leaveTypeLabel} leave request for ${compactDateRange(event.startDate, event.endDate)} has been approved.`,
      }
    case "LEAVE_REJECTED":
      return {
        title: "Leave rejected",
        body: `Your ${event.leaveTypeLabel} leave request for ${compactDateRange(event.startDate, event.endDate)} has been rejected.`,
      }
    case "LEAVE_CANCELLED":
      return {
        title: "Leave cancelled",
        body: `Your ${event.leaveTypeLabel} leave request for ${compactDateRange(event.startDate, event.endDate)} has been cancelled.`,
      }
    case "SHIFT_SWAP_REQUESTED":
      return {
        title: "Shift swap requested",
        body: `${event.requesterName} has requested to swap shifts with you.`,
      }
    case "SHIFT_SWAP_COMPLETED":
      return {
        title: "Shift swap completed",
        body: "Your shift swap has been completed.",
      }
    case "SHIFT_SWAP_REJECTED":
      return {
        title: "Shift swap rejected",
        body: "Your shift swap request has been rejected.",
      }
    case "SHIFT_SWAP_CANCELLED":
      return {
        title: "Shift swap cancelled",
        body: "A shift swap request involving you has been cancelled.",
      }
    case "ROSTER_SUBMITTED_FOR_REVIEW":
      return {
        title: "Roster submitted for review",
        body: `${event.rosterName} has been submitted for review.`,
      }
    case "ROSTER_PUBLISHED":
      return {
        title: "Roster published",
        body: `Your ${rosterDateRange(event.startDate, event.endDate)} roster has been published.`,
      }
    case "ROSTER_RETURNED_TO_DRAFT":
      return {
        title: "Roster returned to draft",
        body: `${event.rosterName} has been returned to draft.`,
      }
    case "ROSTER_AMENDMENT_CREATED":
      return {
        title: "Roster amendment created",
        body: `${event.rosterName} version ${event.versionNumber} has been created as a draft amendment.`,
      }
    case "ATTENDANCE_CORRECTED":
      return {
        title: "Attendance corrected",
        body: "A supervisor has corrected your attendance record.",
      }
    case "ATTENDANCE_APPROVED":
      return {
        title: "Attendance correction approved",
        body: "Your attendance correction has been approved.",
      }
    case "ATTENDANCE_REJECTED":
      return {
        title: "Attendance correction rejected",
        body: "Your attendance correction has been rejected.",
      }
    case "ORGANIZATION_INVITED":
      return {
        title: `Invitation to ${event.organizationName}`,
        body: `You have been invited to join ${event.organizationName} as ${event.roleName}. Accept the invitation: ${event.acceptUrl}`,
      }
  }
}
