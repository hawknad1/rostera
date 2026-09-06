import { auditError } from "@/modules/audit/errors"
import {
  oneShotAuditEventId,
  repeatableAuditEventId,
  serializeAuditMetadata,
} from "@/modules/audit/sanitize"
import type { AuditActor, AuditWriteInput } from "@/modules/audit/types/audit"
import type { TxClient } from "@/modules/audit/types/orm"

const ONE_SHOT_ACTIONS = new Set([
  "ROSTER_CREATED",
  "ROSTER_PUBLISHED",
  "ROSTER_DELETED",
  "ASSIGNMENT_CREATED",
  "ASSIGNMENT_DELETED",
  "LEAVE_CREATED",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "LEAVE_CANCELLED",
  "SHIFT_SWAP_REQUESTED",
  "SHIFT_SWAP_COMPLETED",
  "SHIFT_SWAP_REJECTED",
  "SHIFT_SWAP_CANCELLED",
  "STAFF_CREATED",
  "STAFF_DEACTIVATED",
  "DEPARTMENT_CREATED",
  "DEPARTMENT_DELETED",
  "PROFESSION_CREATED",
  "PROFESSION_DEACTIVATED",
  "SHIFT_TYPE_CREATED",
  "SHIFT_TYPE_DEACTIVATED",
  "STAFFING_REQUIREMENT_CREATED",
  "STAFFING_REQUIREMENT_DELETED",
])

function assertActor(actor: AuditActor) {
  if (!actor.organizationId) {
    throw auditError("INVALID_ACTOR")
  }

  if (actor.type === "USER" && !actor.userId) {
    throw auditError("INVALID_ACTOR")
  }
}

function eventIdFor(input: AuditWriteInput) {
  if (input.eventId) {
    return input.eventId
  }

  if (ONE_SHOT_ACTIONS.has(input.action)) {
    return oneShotAuditEventId(input.action, input.entityId)
  }

  return repeatableAuditEventId(input.action, input.entityId)
}

export function userAuditActor(membership: {
  id: string
  userId: string
  organizationId: string
}): AuditActor {
  return {
    type: "USER",
    userId: membership.userId,
    organizationId: membership.organizationId,
    membershipId: membership.id,
  }
}

export async function recordAuditEvent(tx: TxClient, input: AuditWriteInput) {
  assertActor(input.actor)

  const organizationId = input.actor.organizationId
  const metadata = serializeAuditMetadata(input.metadata)
  const eventId = eventIdFor(input)

  return tx.orm.public.AuditEvent.create({
    organizationId,
    actorType: input.actor.type,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    eventId,
    summary: input.summary.trim(),
    ...(input.actor.type === "USER"
      ? {
          actorUserId: input.actor.userId,
          ...(input.actor.membershipId ? { actorMembershipId: input.actor.membershipId } : {}),
        }
      : {}),
    ...(metadata ? { metadata } : {}),
    ...(input.requestId ? { requestId: input.requestId } : {}),
    ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
  })
}

export async function recordUserAudit(
  tx: TxClient,
  membership: { id: string; userId: string; organizationId: string },
  input: Omit<AuditWriteInput, "actor">,
) {
  return recordAuditEvent(tx, {
    ...input,
    actor: userAuditActor(membership),
  })
}
