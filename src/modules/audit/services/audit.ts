import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { hasPermission } from "@/lib/auth/has-permission"
import { parseCalendarDate } from "@/lib/dates/calendar-date"
import { permissions } from "@/lib/permissions/permissions"
import { auditError } from "@/modules/audit/errors"
import { parseAuditMetadata } from "@/modules/audit/sanitize"
import {
  AUDIT_PAGE_SIZE,
  auditActions,
  auditActorTypes,
  auditEntityTypes,
  type AuditAction,
  type AuditActorType,
  type AuditEntityType,
} from "@/modules/audit/types/audit"
import { formatStaffName } from "@/modules/staff/labels"
import { db } from "@/prisma/db"

export type AuditEventRecord = {
  id: string
  organizationId: string
  actorType: AuditActorType
  actorUserId: string | null
  actorMembershipId: string | null
  actorLabel: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  eventId: string
  summary: string
  metadata: Record<string, unknown> | null
  createdAt: unknown
}

function asAction(value: unknown): AuditAction {
  return auditActions.includes(value as AuditAction)
    ? (value as AuditAction)
    : auditActions[0]
}

function asEntityType(value: unknown): AuditEntityType {
  return auditEntityTypes.includes(value as AuditEntityType)
    ? (value as AuditEntityType)
    : auditEntityTypes[0]
}

function asActorType(value: unknown): AuditActorType {
  return auditActorTypes.includes(value as AuditActorType)
    ? (value as AuditActorType)
    : "USER"
}

function createdAtMs(value: unknown) {
  if (!value) {
    return 0
  }

  if (typeof value === "object" && value !== null && "epochMilliseconds" in value) {
    return Number((value as { epochMilliseconds: number }).epochMilliseconds)
  }

  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? 0 : parsed
}

function createdAtDate(value: unknown) {
  const raw = String(value ?? "")
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
}

async function requireAuditViewer() {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw auditError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permissions.auditView)

  if (!authorized) {
    throw auditError("FORBIDDEN")
  }

  return membership
}

async function actorLabelsFor(
  organizationId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>()
  const uniqueIds = [...new Set(userIds)]

  for (const userId of uniqueIds) {
    const staff = await db.orm.public.StaffProfile.where({
      organizationId,
      userId,
    }).first()

    if (staff) {
      labels.set(
        userId,
        formatStaffName({
          firstName: String(staff.firstName),
          middleName: staff.middleName == null ? null : String(staff.middleName),
          lastName: String(staff.lastName),
        }),
      )
      continue
    }

    const user = await db.orm.public.User.where({ id: userId }).first()
    labels.set(userId, user?.email ? String(user.email) : "User")
  }

  return labels
}

function toRecord(
  row: {
    id: unknown
    organizationId: unknown
    actorType: unknown
    actorUserId?: unknown
    actorMembershipId?: unknown
    action: unknown
    entityType: unknown
    entityId: unknown
    eventId: unknown
    summary: unknown
    metadata?: unknown
    createdAt?: unknown
  },
  actorLabel: string,
): AuditEventRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    actorType: asActorType(row.actorType),
    actorUserId: row.actorUserId == null ? null : String(row.actorUserId),
    actorMembershipId: row.actorMembershipId == null ? null : String(row.actorMembershipId),
    actorLabel,
    action: asAction(row.action),
    entityType: asEntityType(row.entityType),
    entityId: String(row.entityId),
    eventId: String(row.eventId),
    summary: String(row.summary),
    metadata: parseAuditMetadata(row.metadata),
    createdAt: row.createdAt ?? null,
  }
}

export type AuditListFilters = {
  page?: number
  action?: string
  entityType?: string
  actorUserId?: string
  entityId?: string
  q?: string
  from?: string
  to?: string
}

export async function listAuditEvents(filters: AuditListFilters = {}) {
  const membership = await requireAuditViewer()
  const organizationId = membership.organizationId

  const where: Record<string, string> = { organizationId }

  if (filters.action && auditActions.includes(filters.action as AuditAction)) {
    where.action = filters.action
  }

  if (filters.entityType && auditEntityTypes.includes(filters.entityType as AuditEntityType)) {
    where.entityType = filters.entityType
  }

  if (filters.actorUserId) {
    where.actorUserId = filters.actorUserId
  }

  if (filters.entityId) {
    where.entityId = filters.entityId
  }

  const rows = await db.orm.public.AuditEvent.where(where).all()
  const query = filters.q?.trim().toLowerCase() ?? ""
  const from = filters.from?.trim()
  const to = filters.to?.trim()
  let fromDate: string | null = null
  let toDate: string | null = null

  try {
    if (from) {
      parseCalendarDate(from)
      fromDate = from
    }
  } catch {
    fromDate = null
  }

  try {
    if (to) {
      parseCalendarDate(to)
      toDate = to
    }
  } catch {
    toDate = null
  }

  const filtered = rows.filter((row) => {
    const date = createdAtDate(row.createdAt)
    if (fromDate && date && date < fromDate) {
      return false
    }

    if (toDate && date && date > toDate) {
      return false
    }

    if (!query) {
      return true
    }

    const haystack = `${row.summary ?? ""} ${row.entityId ?? ""} ${row.action ?? ""}`.toLowerCase()
    return haystack.includes(query)
  })

  filtered.sort((left, right) => createdAtMs(right.createdAt) - createdAtMs(left.createdAt))

  const page = Number.isFinite(filters.page) && (filters.page ?? 1) > 0 ? Math.floor(filters.page ?? 1) : 1
  const start = (page - 1) * AUDIT_PAGE_SIZE
  const pageRows = filtered.slice(start, start + AUDIT_PAGE_SIZE)
  const labels = await actorLabelsFor(
    organizationId,
    pageRows
      .map((row) => (row.actorUserId == null ? null : String(row.actorUserId)))
      .filter((id): id is string => Boolean(id)),
  )

  return {
    items: pageRows.map((row) =>
      toRecord(
        row,
        row.actorType === "SYSTEM"
          ? "System"
          : labels.get(String(row.actorUserId)) ?? "User",
      ),
    ),
    page,
    pageSize: AUDIT_PAGE_SIZE,
    total: filtered.length,
    hasPrevious: page > 1,
    hasNext: start + AUDIT_PAGE_SIZE < filtered.length,
  }
}

export async function getAuditEvent(auditId: string) {
  const membership = await requireAuditViewer()
  const row = await db.orm.public.AuditEvent.where({
    id: auditId,
    organizationId: membership.organizationId,
  }).first()

  if (!row) {
    throw auditError("AUDIT_NOT_FOUND")
  }

  const labels = await actorLabelsFor(
    membership.organizationId,
    row.actorUserId == null ? [] : [String(row.actorUserId)],
  )

  return toRecord(
    row,
    row.actorType === "SYSTEM"
      ? "System"
      : labels.get(String(row.actorUserId)) ?? "User",
  )
}

export async function listAuditActors() {
  const membership = await requireAuditViewer()
  const rows = await db.orm.public.AuditEvent.where({
    organizationId: membership.organizationId,
  }).all()

  const userIds = [
    ...new Set(
      rows
        .map((row) => (row.actorUserId == null ? null : String(row.actorUserId)))
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const labels = await actorLabelsFor(membership.organizationId, userIds)

  return userIds
    .map((id) => ({ id, label: labels.get(id) ?? "User" }))
    .sort((left, right) => left.label.localeCompare(right.label))
}
