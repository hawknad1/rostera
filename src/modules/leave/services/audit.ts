import { Temporal } from "temporal-polyfill"

import type { LeaveStatus } from "@/modules/scheduling/types/leave"

export const leaveAuditEventTypes = [
  "LEAVE_REQUESTED",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "LEAVE_CANCELLED",
] as const

export type LeaveAuditEventType = (typeof leaveAuditEventTypes)[number]

export type LeaveAuditEvent = {
  type: LeaveAuditEventType
  organizationId: string
  leaveId: string
  staffId: string
  actorUserId: string
  previousStatus: LeaveStatus | null
  newStatus: LeaveStatus
  occurredAt: Temporal.Instant
}

/**
 * Phase 3H does not persist audit events.
 * A future audit module should record this payload when leave status changes.
 */
export function leaveAuditPoint(event: LeaveAuditEvent): void {
  void event
}
