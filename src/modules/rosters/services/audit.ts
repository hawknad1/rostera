import { Temporal } from "temporal-polyfill"

import type { RosterStatus } from "@/modules/rosters/labels"

export type RosterStatusChangeAuditEvent = {
  rosterId: string
  organizationId: string
  actorUserId: string
  previousStatus: RosterStatus
  newStatus: RosterStatus
  occurredAt: Temporal.Instant
}

/**
 * Phase 3F does not persist audit events.
 * A future audit module should record this payload when a roster status changes.
 */
export function rosterStatusChangeAuditPoint(event: RosterStatusChangeAuditEvent): void {
  void event
}
