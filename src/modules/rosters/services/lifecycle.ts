import { Temporal } from "temporal-polyfill"

import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { RosterError, rosterError } from "@/modules/rosters/errors"
import { rosterStatusChangeAuditPoint } from "@/modules/rosters/services/audit"
import {
  evaluateRosterValidation,
  type ValidateRosterOptions,
} from "@/modules/rosters/services/validation"
import {
  assertRosterTransition,
  isRosterStatus,
} from "@/modules/rosters/validation/status-transition"
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

export async function submitRosterForReview(
  rosterId: string,
  options: ValidateRosterOptions = {},
) {
  const membership = await requireRosterAccess(permissions.rosterReview)
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)

  try {
    return await db.transaction(async (tx: TxClient) => {
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
        options,
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

      return updated
    })
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
    return await db.transaction(async (tx: TxClient) => {
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

      return updated
    })
  } catch (error) {
    if (error instanceof RosterError) {
      throw error
    }

    throw rosterError("FAILED")
  }
}

export async function publishRoster(rosterId: string, options: ValidateRosterOptions = {}) {
  const membership = await requireRosterAccess(permissions.rosterPublish)
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)

  try {
    return await db.transaction(async (tx: TxClient) => {
      const roster = await findOwnedRoster(tx.orm, organizationId, rosterId)

      if (!roster) {
        throw rosterError("ROSTER_NOT_FOUND")
      }

      const previousStatus = asRosterStatus(roster.status)
      assertRosterTransition(previousStatus, "PUBLISHED")

      const validation = await evaluateRosterValidation(tx.orm, {
        organizationId,
        timeZone,
        roster,
        options,
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

      return updated
    })
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

      return deleted
    })
  } catch (error) {
    if (error instanceof RosterError) {
      throw error
    }

    throw rosterError("FAILED")
  }
}
