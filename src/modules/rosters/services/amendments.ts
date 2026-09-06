import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { permissions } from "@/lib/permissions/permissions"
import { quoteAuditName } from "@/modules/audit/copy"
import { recordUserAudit } from "@/modules/audit/services/record"
import {
  enqueueDomainNotification,
  processDomainNotification,
} from "@/modules/notifications/services/emit"
import { RosterError, rosterError } from "@/modules/rosters/errors"
import type { CreateRosterAmendmentInput } from "@/modules/rosters/schemas/roster"
import {
  assertCurrentPublishedSource,
  assertNoActiveAmendment,
  nextVersionNumber,
  rosterSeriesId,
  rosterVersionNumber,
} from "@/modules/rosters/services/versions"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm
type TxClient = { orm: PublicOrm }

async function requireAmendAccess() {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw rosterError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permissions.rosterAmend)

  if (!authorized) {
    throw rosterError("FORBIDDEN")
  }

  return membership
}

function copyAssignmentRow(
  source: {
    organizationId: string
    departmentId: string
    staffId: string
    shiftTypeId: string
    professionId: string
    date: string
    shiftStartTime: string
    shiftEndTime: string
    isOvernight: boolean
    startDateTime: unknown
    endDateTime: unknown
    id: string
  },
  rosterId: string,
) {
  return {
    organizationId: source.organizationId,
    rosterId,
    departmentId: source.departmentId,
    staffId: source.staffId,
    shiftTypeId: source.shiftTypeId,
    professionId: source.professionId,
    date: source.date,
    shiftStartTime: source.shiftStartTime,
    shiftEndTime: source.shiftEndTime,
    isOvernight: source.isOvernight,
    startDateTime: source.startDateTime,
    endDateTime: source.endDateTime,
    copiedFromAssignmentId: String(source.id),
  }
}

export async function createRosterAmendment(input: CreateRosterAmendmentInput) {
  const membership = await requireAmendAccess()
  const organizationId = membership.organizationId
  const reason = input.reason

  const source = await db.orm.public.Roster.where({
    id: input.rosterId,
    organizationId,
  }).first()

  if (!source) {
    throw rosterError("ROSTER_NOT_FOUND")
  }

  const versions = await db.orm.public.Roster.where({
    organizationId,
    seriesId: rosterSeriesId(source),
  }).all()

  assertCurrentPublishedSource(source, versions)
  assertNoActiveAmendment(versions)

  try {
    const created = await db.transaction(async (tx: TxClient) => {
      const currentVersions = await tx.orm.public.Roster.where({
        organizationId,
        seriesId: rosterSeriesId(source),
      }).all()

      const currentSource = currentVersions.find((row) => String(row.id) === String(source.id))
      if (!currentSource) {
        throw rosterError("ROSTER_NOT_FOUND")
      }

      assertCurrentPublishedSource(currentSource, currentVersions)
      assertNoActiveAmendment(currentVersions)

      const versionNumber = nextVersionNumber(currentVersions)
      const amendment = await tx.orm.public.Roster.create({
        organizationId,
        departmentId: currentSource.departmentId,
        name: currentSource.name,
        startDate: currentSource.startDate,
        endDate: currentSource.endDate,
        status: "DRAFT",
        seriesId: rosterSeriesId(currentSource),
        versionNumber,
        parentRosterId: String(currentSource.id),
        amendmentReason: reason,
        createdByUserId: membership.userId,
      })

      const sourceAssignments = await tx.orm.public.ShiftAssignment.where({
        organizationId,
        rosterId: String(currentSource.id),
      }).all()

      for (const assignment of sourceAssignments) {
        await tx.orm.public.ShiftAssignment.create(
          copyAssignmentRow(assignment, String(amendment.id)),
        )
      }

      await recordUserAudit(tx, membership, {
        action: "ROSTER_AMENDMENT_CREATED",
        entityType: "ROSTER",
        entityId: String(amendment.id),
        summary: `Created amendment of roster ${quoteAuditName(String(amendment.name))} (version ${versionNumber}).`,
        metadata: {
          sourceRosterId: String(currentSource.id),
          sourceVersion: rosterVersionNumber(currentSource),
          newVersion: versionNumber,
          reason,
        },
      })

      await enqueueDomainNotification(tx, {
        type: "ROSTER_AMENDMENT_CREATED",
        organizationId,
        eventId: String(amendment.id),
        actorUserId: membership.userId,
        rosterId: String(amendment.id),
        departmentId: String(amendment.departmentId),
        createdByUserId: String(amendment.createdByUserId),
        rosterName: String(amendment.name),
        versionNumber,
        sourceVersion: rosterVersionNumber(currentSource),
        reason,
      })

      return amendment
    })

    await processDomainNotification({
      organizationId,
      type: "ROSTER_AMENDMENT_CREATED",
      eventId: String(created.id),
    })

    return created
  } catch (error) {
    if (error instanceof RosterError) {
      throw error
    }

    if (isUniqueConstraintViolation(error)) {
      throw rosterError("AMENDMENT_ALREADY_EXISTS")
    }

    throw rosterError("FAILED")
  }
}
