import { Temporal } from "temporal-polyfill"

export const shiftSwapAuditEventTypes = ["SHIFT_SWAP_COMPLETED"] as const

export type ShiftSwapAuditEventType = (typeof shiftSwapAuditEventTypes)[number]

export type ShiftSwapCompletedAuditEvent = {
  type: "SHIFT_SWAP_COMPLETED"
  organizationId: string
  swapId: string
  sourceAssignmentId: string
  targetAssignmentId: string
  previousSourceStaffId: string
  previousTargetStaffId: string
  completedByUserId: string
  timestamp: Temporal.Instant
}

/**
 * Phase 3I does not persist audit events.
 * A future audit module should record this payload when a swap is completed.
 */
export function shiftSwapAuditPoint(event: ShiftSwapCompletedAuditEvent): void {
  void event
}
