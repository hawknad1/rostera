import { Temporal } from "temporal-polyfill"

import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { quoteAuditName } from "@/modules/audit/copy"
import { recordUserAudit } from "@/modules/audit/services/record"
import { RosterError, rosterError } from "@/modules/rosters/errors"
import { rosterStatusChangeAuditPoint } from "@/modules/rosters/services/audit"
import { evaluateRosterValidation } from "@/modules/rosters/services/validation"
import {
  currentPublishedVersion,
  parentVersion,
  rosterSeriesId,
  rosterVersionNumber,
} from "@/modules/rosters/services/versions"
import {
  assertRosterTransition,
  isRosterStatus,
} from "@/modules/rosters/validation/status-transition"
import {
  enqueueDomainNotification,
  processDomainNotification,
} from "@/modules/notifications/services/emit"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm
type TxClient = { orm: PublicOrm }

async function requireRosterAccess(permission: Permission) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw rosterError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permission)

  if (!authorized) {
    throw rosterError("FORBIDDEN")
  }

  return membership
}

async function findOwnedRoster(orm: PublicOrm, organizationId: string, rosterId: string) {
  return orm.public.Roster.where({
    id: rosterId,
    organizationId,
  }).first()
}

function asRosterStatus(status: string) {
  if (!isRosterStatus(status)) {
    throw rosterError("INVALID_ROSTER_TRANSITION")
  }

  return status
}

async function deleteRosterAssignments(
  orm: PublicOrm,
  organizationId: string,
  rosterId: string,
) {
  const assignments = await orm.public.ShiftAssignment.where({
    organizationId,
    rosterId,
  }).all()

  for (const assignment of assignments) {
    const deleted = await orm.public.ShiftAssignment.where({
      id: assignment.id,
      organizationId,
    }).delete()

    if (!deleted) {
      throw rosterError("FAILED")
    }
  }
}

export async function submitRosterForReview(rosterId: string) {
  const membership = await requireRosterAccess(permissions.rosterReview)
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)

  try {
    const submitted = await db.transaction(async (tx: TxClient) => {
      const roster = await findOwnedRoster(tx.orm, organizationId, rosterId)

      if (!roster) {
        throw rosterError("ROSTER_NOT_FOUND")
      }

      const previousStatus = asRosterStatus(roster.status)
      assertRosterTransition(previousStatus, "IN_REVIEW")

      const validation = await evaluateRosterValidation(tx.orm, {
        organizationId,
        timeZone,
        roster,
      })

      if (!validation.valid) {
        throw rosterError("ROSTER_HAS_BLOCKING_CONFLICTS", validation)
      }

      const updated = await tx.orm.public.Roster.where({
        id: roster.id,
        organizationId,
        status: "DRAFT",
      }).update({
        status: "IN_REVIEW",
      })

      if (!updated) {
        throw rosterError("ROSTER_NOT_REVIEWABLE")
      }

      rosterStatusChangeAuditPoint({
        rosterId: updated.id,
        organizationId,
        actorUserId: membership.userId,
        previousStatus,
        newStatus: "IN_REVIEW",
        occurredAt: Temporal.Now.instant(),
      })

      await recordUserAudit(tx, membership, {
        action: "ROSTER_SUBMITTED_FOR_REVIEW",
        entityType: "ROSTER",
        entityId: String(updated.id),
        summary: `Submitted roster ${quoteAuditName(String(updated.name))} for review.`,
        metadata: {
          before: { status: previousStatus },
          after: { status: "IN_REVIEW" },
        },
      })

      await enqueueDomainNotification(tx, {
        type: "ROSTER_SUBMITTED_FOR_REVIEW",
        organizationId,
        eventId: String(updated.id),
        actorUserId: membership.userId,
        rosterId: String(updated.id),
        departmentId: String(updated.departmentId),
        createdByUserId: String(updated.createdByUserId),
        rosterName: String(updated.name),
      })

      return updated
    })

    await processDomainNotification({
      organizationId,
      type: "ROSTER_SUBMITTED_FOR_REVIEW",
      eventId: String(submitted.id),
    })

    return submitted
  } catch (error) {
    if (error instanceof RosterError) {
      throw error
    }

    throw rosterError("FAILED")
  }
}

export async function returnRosterToDraft(rosterId: string) {
  const membership = await requireRosterAccess(permissions.rosterReview)
  const organizationId = membership.organizationId

  try {
    const returned = await db.transaction(async (tx: TxClient) => {
      const roster = await findOwnedRoster(tx.orm, organizationId, rosterId)

      if (!roster) {
        throw rosterError("ROSTER_NOT_FOUND")
      }

      const previousStatus = asRosterStatus(roster.status)
      assertRosterTransition(previousStatus, "DRAFT")

      const updated = await tx.orm.public.Roster.where({
        id: roster.id,
        organizationId,
        status: "IN_REVIEW",
      }).update({
        status: "DRAFT",
      })

      if (!updated) {
        throw rosterError("INVALID_ROSTER_TRANSITION")
      }

      rosterStatusChangeAuditPoint({
        rosterId: updated.id,
        organizationId,
        actorUserId: membership.userId,
        previousStatus,
        newStatus: "DRAFT",
        occurredAt: Temporal.Now.instant(),
      })

      await recordUserAudit(tx, membership, {
        action: "ROSTER_RETURNED_TO_DRAFT",
        entityType: "ROSTER",
        entityId: String(updated.id),
        summary: `Returned roster ${quoteAuditName(String(updated.name))} to draft.`,
        metadata: {
          before: { status: previousStatus },
          after: { status: "DRAFT" },
        },
      })

      await enqueueDomainNotification(tx, {
        type: "ROSTER_RETURNED_TO_DRAFT",
        organizationId,
        eventId: String(updated.id),
        actorUserId: membership.userId,
        rosterId: String(updated.id),
        departmentId: String(updated.departmentId),
        createdByUserId: String(updated.createdByUserId),
        rosterName: String(updated.name),
      })

      return updated
    })

    await processDomainNotification({
      organizationId,
      type: "ROSTER_RETURNED_TO_DRAFT",
      eventId: String(returned.id),
    })

    return returned
  } catch (error) {
    if (error instanceof RosterError) {
      throw error
    }

    throw rosterError("FAILED")
  }
}

export async function publishRoster(rosterId: string) {
  const membership = await requireRosterAccess(permissions.rosterPublish)
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)

  try {
    const published = await db.transaction(async (tx: TxClient) => {
      const roster = await findOwnedRoster(tx.orm, organizationId, rosterId)

      if (!roster) {
        throw rosterError("ROSTER_NOT_FOUND")
      }

      const previousStatus = asRosterStatus(roster.status)
      assertRosterTransition(previousStatus, "PUBLISHED")

      if (rosterVersionNumber(roster) > 1) {
        const versions = await tx.orm.public.Roster.where({
          organizationId,
          seriesId: rosterSeriesId(roster),
        }).all()
        const parent = parentVersion(roster, versions)
        const currentPublished = currentPublishedVersion(versions)

        if (
          !parent ||
          parent.status !== "PUBLISHED" ||
          !currentPublished ||
          String(currentPublished.id) !== String(parent.id)
        ) {
          throw rosterError("NOT_CURRENT_PUBLISHED_VERSION")
        }
      }

      const validation = await evaluateRosterValidation(tx.orm, {
        organizationId,
        timeZone,
        roster,
      })

      if (!validation.valid) {
        throw rosterError("ROSTER_HAS_BLOCKING_CONFLICTS", validation)
      }

      const updated = await tx.orm.public.Roster.where({
        id: roster.id,
        organizationId,
        status: "IN_REVIEW",
      }).update({
        status: "PUBLISHED",
      })

      if (!updated) {
        throw rosterError("ROSTER_NOT_PUBLISHABLE")
      }

      rosterStatusChangeAuditPoint({
        rosterId: updated.id,
        organizationId,
        actorUserId: membership.userId,
        previousStatus,
        newStatus: "PUBLISHED",
        occurredAt: Temporal.Now.instant(),
      })

      await recordUserAudit(tx, membership, {
        action: "ROSTER_PUBLISHED",
        entityType: "ROSTER",
        entityId: String(updated.id),
        summary: `Published roster ${quoteAuditName(String(updated.name))}.`,
        metadata: {
          before: { status: previousStatus },
          after: { status: "PUBLISHED" },
          version: rosterVersionNumber(updated),
          previousVersion:
            rosterVersionNumber(updated) > 1 ? rosterVersionNumber(updated) - 1 : undefined,
        },
      })

      await enqueueDomainNotification(tx, {
        type: "ROSTER_PUBLISHED",
        organizationId,
        eventId: String(updated.id),
        actorUserId: membership.userId,
        rosterId: String(updated.id),
        startDate: String(updated.startDate),
        endDate: String(updated.endDate),
      })

      return updated
    })

    await processDomainNotification({
      organizationId,
      type: "ROSTER_PUBLISHED",
      eventId: String(published.id),
    })

    return published
  } catch (error) {
    if (error instanceof RosterError) {
      throw error
    }

    throw rosterError("FAILED")
  }
}

export async function deleteRoster(rosterId: string) {
  const membership = await requireRosterAccess(permissions.rosterEdit)
  const organizationId = membership.organizationId

  try {
    return await db.transaction(async (tx: TxClient) => {
      const roster = await findOwnedRoster(tx.orm, organizationId, rosterId)

      if (!roster) {
        throw rosterError("ROSTER_NOT_FOUND")
      }

      if (roster.status === "PUBLISHED") {
        throw rosterError("ROSTER_ALREADY_PUBLISHED")
      }

      if (roster.status !== "DRAFT") {
        throw rosterError("ROSTER_NOT_DRAFT")
      }

      await deleteRosterAssignments(tx.orm, organizationId, roster.id)

      const deleted = await tx.orm.public.Roster.where({
        id: roster.id,
        organizationId,
        status: "DRAFT",
      }).delete()

      if (!deleted) {
        throw rosterError("ROSTER_NOT_FOUND")
      }

      await recordUserAudit(tx, membership, {
        action: "ROSTER_DELETED",
        entityType: "ROSTER",
        entityId: String(deleted.id),
        summary: `Deleted roster ${quoteAuditName(String(deleted.name))}.`,
        metadata: {
          before: {
            name: deleted.name,
            status: deleted.status,
            startDate: deleted.startDate,
            endDate: deleted.endDate,
            versionNumber: rosterVersionNumber(deleted),
            seriesId: rosterSeriesId(deleted),
          },
        },
      })

      return deleted
    })
  } catch (error) {
    if (error instanceof RosterError) {
      throw error
    }

    throw rosterError("FAILED")
  }
}
