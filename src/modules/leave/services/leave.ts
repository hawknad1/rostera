import { Temporal } from "temporal-polyfill"

import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import type { CurrentMembership } from "@/lib/auth/get-current-membership"
import {
  assertValidDateRange,
  CalendarDateError,
  calendarDateRangesOverlap,
  inclusiveCalendarDayCount,
  parseCalendarDate,
} from "@/lib/dates/calendar-date"
import { isExclusionConstraintViolation } from "@/lib/db/exclusion-constraint"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { isLeaveError, leaveError } from "@/modules/leave/errors"
import { leaveAuditPoint } from "@/modules/leave/services/audit"
import type { CreateLeaveInput } from "@/modules/leave/schemas/leave"
import { leaveTypes, type LeaveType } from "@/modules/leave/schemas/leave"
import { recordUserAudit } from "@/modules/audit/services/record"
import { leaveTypePhrase } from "@/modules/notifications/copy"
import {
  enqueueDomainNotification,
  processDomainNotification,
} from "@/modules/notifications/services/emit"
import { formatStaffName } from "@/modules/staff/labels"
import type { LeaveStatus } from "@/modules/scheduling/types/leave"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm
type TxClient = { orm: PublicOrm }

const ACTIVE_LEAVE_STATUSES: readonly LeaveStatus[] = ["PENDING", "APPROVED"]

async function requireLeaveAccess(permission: Permission) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw leaveError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permission)

  if (!authorized) {
    throw leaveError("FORBIDDEN")
  }

  return membership
}

async function canCreateLeaveForOthers(membership: CurrentMembership) {
  const [canCreate, canApprove] = await Promise.all([
    hasPermission(membership, permissions.leaveCreate),
    hasPermission(membership, permissions.leaveApprove),
  ])

  return canCreate && canApprove
}

async function isStaffSelfService(membership: CurrentMembership) {
  const [canCreate, forOthers] = await Promise.all([
    hasPermission(membership, permissions.leaveCreate),
    canCreateLeaveForOthers(membership),
  ])

  return canCreate && !forOthers
}

async function findLinkedStaff(orm: PublicOrm, organizationId: string, userId: string) {
  return orm.public.StaffProfile.where({
    organizationId,
    userId,
  }).first()
}

async function findOwnedLeave(orm: PublicOrm, organizationId: string, leaveId: string) {
  return orm.public.LeaveRequest.where({
    id: leaveId,
    organizationId,
  }).first()
}

function asLeaveType(value: string): LeaveType {
  if (leaveTypes.includes(value as LeaveType)) {
    return value as LeaveType
  }

  return "OTHER"
}

function asLeaveStatus(value: string): LeaveStatus {
  if (value === "PENDING" || value === "APPROVED" || value === "REJECTED" || value === "CANCELLED") {
    return value
  }

  return "PENDING"
}

function actorLabel(user: { email?: string | null; phone?: string | null } | null) {
  if (!user) {
    return "Unknown user"
  }

  return user.email || user.phone || "Unknown user"
}

function sortLeave<T extends { createdAt?: unknown; startDate: string; staffName: string }>(
  rows: T[],
) {
  return [...rows].sort((left, right) => {
    const start = right.startDate.localeCompare(left.startDate)
    if (start !== 0) {
      return start
    }

    return left.staffName.localeCompare(right.staffName)
  })
}

async function loadActiveLeaveForStaff(
  orm: PublicOrm,
  organizationId: string,
  staffId: string,
) {
  const [pending, approved] = await Promise.all([
    orm.public.LeaveRequest.where({
      organizationId,
      staffId,
      status: "PENDING",
    }).all(),
    orm.public.LeaveRequest.where({
      organizationId,
      staffId,
      status: "APPROVED",
    }).all(),
  ])

  return [...pending, ...approved].filter(
    (row) =>
      row.organizationId === organizationId &&
      row.staffId === staffId &&
      ACTIVE_LEAVE_STATUSES.includes(asLeaveStatus(row.status)),
  )
}

function assertNoActiveOverlap(
  existing: Array<{ id: string; startDate: string; endDate: string }>,
  startDate: string,
  endDate: string,
  ignoreId?: string,
) {
  const overlapping = existing.some(
    (row) =>
      row.id !== ignoreId &&
      calendarDateRangesOverlap(row.startDate, row.endDate, startDate, endDate),
  )

  if (overlapping) {
    throw leaveError("LEAVE_OVERLAP")
  }
}

function toLeaveListItem(
  row: {
    id: string
    organizationId: string
    staffId: string
    leaveType: string
    startDate: string
    endDate: string
    status: string
    notes?: string | null
    requestedByUserId: string
    reviewedByUserId?: string | null
    reviewedAt?: unknown
    createdAt: unknown
  },
  staff: { firstName: string; middleName?: string | null; lastName: string; staffNumber: string } | null,
  requestedBy: { email?: string | null; phone?: string | null } | null,
  reviewedBy: { email?: string | null; phone?: string | null } | null,
) {
  const startDate = parseCalendarDate(row.startDate).toString()
  const endDate = parseCalendarDate(row.endDate).toString()

  return {
    id: row.id,
    organizationId: row.organizationId,
    staffId: row.staffId,
    staffName: staff ? formatStaffName(staff) : "Unknown staff",
    staffNumber: staff?.staffNumber ?? "",
    leaveType: asLeaveType(row.leaveType),
    startDate,
    endDate,
    durationDays: inclusiveCalendarDayCount(startDate, endDate),
    status: asLeaveStatus(row.status),
    notes: row.notes ?? null,
    requestedByUserId: row.requestedByUserId,
    requestedByLabel: actorLabel(requestedBy),
    reviewedByUserId: row.reviewedByUserId ?? null,
    reviewedByLabel: row.reviewedByUserId ? actorLabel(reviewedBy) : null,
    reviewedAt: row.reviewedAt ?? null,
    createdAt: row.createdAt,
  }
}

async function hydrateLeaveRows(
  orm: PublicOrm,
  organizationId: string,
  rows: Array<{
    id: string
    organizationId: string
    staffId: string
    leaveType: string
    startDate: string
    endDate: string
    status: string
    notes?: string | null
    requestedByUserId: string
    reviewedByUserId?: string | null
    reviewedAt?: unknown
    createdAt: unknown
  }>,
) {
  const tenantRows = rows.filter((row) => row.organizationId === organizationId)
  const staffIds = [...new Set(tenantRows.map((row) => row.staffId))]
  const userIds = [
    ...new Set(
      tenantRows.flatMap((row) =>
        [row.requestedByUserId, row.reviewedByUserId].filter((id): id is string => Boolean(id)),
      ),
    ),
  ]

  const [staffRows, userRows] = await Promise.all([
    Promise.all(
      staffIds.map((staffId) =>
        orm.public.StaffProfile.where({ id: staffId, organizationId }).first(),
      ),
    ),
    Promise.all(userIds.map((userId) => orm.public.User.where({ id: userId }).first())),
  ])

  const staffById = new Map(
    staffRows.filter(Boolean).map((staff) => [staff!.id, staff!]),
  )
  const usersById = new Map(userRows.filter(Boolean).map((user) => [user!.id, user!]))

  return sortLeave(
    tenantRows.map((row) =>
      toLeaveListItem(
        row,
        staffById.get(row.staffId) ?? null,
        usersById.get(row.requestedByUserId) ?? null,
        row.reviewedByUserId ? (usersById.get(row.reviewedByUserId) ?? null) : null,
      ),
    ),
  )
}

export async function getLeaveCapabilities() {
  const membership = await requireLeaveAccess(permissions.leaveView)
  const [canCreate, canApprove, canReject, forOthers, selfService] = await Promise.all([
    hasPermission(membership, permissions.leaveCreate),
    hasPermission(membership, permissions.leaveApprove),
    hasPermission(membership, permissions.leaveReject),
    canCreateLeaveForOthers(membership),
    isStaffSelfService(membership),
  ])

  const linkedStaff = await findLinkedStaff(
    db.orm,
    membership.organizationId,
    membership.userId,
  )

  return {
    canCreate,
    canApprove,
    canReject,
    canCreateForOthers: forOthers,
    isStaffSelfService: selfService,
    ownStaffId: linkedStaff?.id ?? null,
  }
}

export async function listLeaveStaffOptions() {
  const membership = await requireLeaveAccess(permissions.leaveCreate)
  const forOthers = await canCreateLeaveForOthers(membership)

  if (!forOthers) {
    return []
  }

  const staff = await db.orm.public.StaffProfile.where({
    organizationId: membership.organizationId,
    employmentStatus: "ACTIVE",
  }).all()

  return [...staff]
    .filter((member) => member.organizationId === membership.organizationId)
    .sort((left, right) => {
      const last = left.lastName.localeCompare(right.lastName)
      if (last !== 0) {
        return last
      }

      return left.firstName.localeCompare(right.firstName)
    })
    .map((member) => ({
      id: member.id,
      name: formatStaffName(member),
      staffNumber: member.staffNumber,
    }))
}

export async function listLeave() {
  const membership = await requireLeaveAccess(permissions.leaveView)
  const organizationId = membership.organizationId
  const selfService = await isStaffSelfService(membership)

  if (selfService) {
    const linkedStaff = await findLinkedStaff(db.orm, organizationId, membership.userId)

    if (!linkedStaff) {
      return []
    }

    const rows = await db.orm.public.LeaveRequest.where({
      organizationId,
      staffId: linkedStaff.id,
    }).all()

    return hydrateLeaveRows(
      db.orm,
      organizationId,
      rows.filter((row) => row.staffId === linkedStaff.id),
    )
  }

  const rows = await db.orm.public.LeaveRequest.where({
    organizationId,
  }).all()

  return hydrateLeaveRows(db.orm, organizationId, rows)
}

export async function getLeave(leaveId: string) {
  const membership = await requireLeaveAccess(permissions.leaveView)
  const organizationId = membership.organizationId
  const row = await findOwnedLeave(db.orm, organizationId, leaveId)

  if (!row) {
    throw leaveError("LEAVE_NOT_FOUND")
  }

  const selfService = await isStaffSelfService(membership)

  if (selfService) {
    const linkedStaff = await findLinkedStaff(db.orm, organizationId, membership.userId)

    if (!linkedStaff || linkedStaff.id !== row.staffId) {
      throw leaveError("LEAVE_NOT_FOUND")
    }
  }

  const [hydrated] = await hydrateLeaveRows(db.orm, organizationId, [row])

  if (!hydrated) {
    throw leaveError("LEAVE_NOT_FOUND")
  }

  return hydrated
}

export async function createLeave(input: CreateLeaveInput) {
  const membership = await requireLeaveAccess(permissions.leaveCreate)
  const organizationId = membership.organizationId
  const forOthers = await canCreateLeaveForOthers(membership)

  let startDate: string
  let endDate: string

  try {
    startDate = parseCalendarDate(input.startDate).toString()
    endDate = parseCalendarDate(input.endDate).toString()
    assertValidDateRange(startDate, endDate)
  } catch (error) {
    if (error instanceof CalendarDateError) {
      throw leaveError("LEAVE_INVALID_DATE_RANGE")
    }

    throw leaveError("FAILED")
  }

  let staffId = input.staffId

  if (!forOthers) {
    const linkedStaff = await findLinkedStaff(db.orm, organizationId, membership.userId)

    if (!linkedStaff) {
      throw leaveError("STAFF_NOT_LINKED")
    }

    if (staffId && staffId !== linkedStaff.id) {
      throw leaveError("LEAVE_NOT_YOURS")
    }

    staffId = linkedStaff.id
  }

  if (!staffId) {
    throw leaveError("STAFF_NOT_IN_ORGANIZATION")
  }

  try {
    const created = await db.transaction(async (tx: TxClient) => {
      const staff = await tx.orm.public.StaffProfile.where({
        id: staffId,
        organizationId,
      }).first()

      if (!staff || staff.organizationId !== organizationId) {
        throw leaveError("STAFF_NOT_IN_ORGANIZATION")
      }

      if (staff.employmentStatus !== "ACTIVE") {
        throw leaveError("STAFF_NOT_ACTIVE")
      }

      const active = await loadActiveLeaveForStaff(tx.orm, organizationId, staff.id)
      assertNoActiveOverlap(active, startDate, endDate)

      const createdLeave = await tx.orm.public.LeaveRequest.create({
        organizationId,
        staffId: staff.id,
        leaveType: input.leaveType,
        startDate,
        endDate,
        status: "PENDING",
        requestedByUserId: membership.userId,
        ...(input.notes ? { notes: input.notes } : {}),
      })

      leaveAuditPoint({
        type: "LEAVE_REQUESTED",
        organizationId,
        leaveId: String(createdLeave.id),
        staffId: staff.id,
        actorUserId: membership.userId,
        previousStatus: null,
        newStatus: "PENDING",
        occurredAt: Temporal.Now.instant(),
      })

      await recordUserAudit(tx, membership, {
        action: "LEAVE_CREATED",
        entityType: "LEAVE_REQUEST",
        entityId: String(createdLeave.id),
        summary: `Created ${leaveTypePhrase(input.leaveType)} leave request.`,
        metadata: {
          after: {
            staffId: staff.id,
            leaveType: input.leaveType,
            startDate,
            endDate,
            status: "PENDING",
          },
        },
      })

      await enqueueDomainNotification(tx, {
        type: "LEAVE_REQUESTED",
        organizationId,
        eventId: String(createdLeave.id),
        actorUserId: membership.userId,
        staffId: staff.id,
        staffName: formatStaffName({
          firstName: String(staff.firstName),
          middleName: staff.middleName == null ? null : String(staff.middleName),
          lastName: String(staff.lastName),
        }),
        leaveTypeLabel: leaveTypePhrase(input.leaveType),
        startDate,
        endDate,
      })

      return createdLeave
    })

    await processDomainNotification({
      organizationId,
      type: "LEAVE_REQUESTED",
      eventId: String(created.id),
    })

    return created
  } catch (error) {
    if (isLeaveError(error)) {
      throw error
    }

    if (isExclusionConstraintViolation(error)) {
      throw leaveError("LEAVE_OVERLAP")
    }

    throw leaveError("FAILED")
  }
}

export async function approveLeave(leaveId: string) {
  const membership = await requireLeaveAccess(permissions.leaveApprove)
  const organizationId = membership.organizationId

  try {
    const updated = await db.transaction(async (tx: TxClient) => {
      const existing = await findOwnedLeave(tx.orm, organizationId, leaveId)

      if (!existing) {
        throw leaveError("LEAVE_NOT_FOUND")
      }

      if (asLeaveStatus(existing.status) !== "PENDING") {
        throw leaveError("LEAVE_NOT_PENDING")
      }

      const staff = await tx.orm.public.StaffProfile.where({
        id: existing.staffId,
        organizationId,
      }).first()

      if (!staff || staff.organizationId !== organizationId) {
        throw leaveError("STAFF_NOT_IN_ORGANIZATION")
      }

      if (staff.employmentStatus !== "ACTIVE") {
        throw leaveError("STAFF_NOT_ACTIVE")
      }

      const approved = await tx.orm.public.LeaveRequest.where({
        id: existing.id,
        organizationId,
        status: "PENDING",
      }).update({
        status: "APPROVED",
        reviewedByUserId: membership.userId,
        reviewedAt: Temporal.Now.instant(),
      })

      if (!approved) {
        throw leaveError("LEAVE_NOT_PENDING")
      }

      leaveAuditPoint({
        type: "LEAVE_APPROVED",
        organizationId,
        leaveId: String(approved.id),
        staffId: existing.staffId,
        actorUserId: membership.userId,
        previousStatus: "PENDING",
        newStatus: "APPROVED",
        occurredAt: Temporal.Now.instant(),
      })

      await recordUserAudit(tx, membership, {
        action: "LEAVE_APPROVED",
        entityType: "LEAVE_REQUEST",
        entityId: String(approved.id),
        summary: `Approved ${leaveTypePhrase(asLeaveType(String(existing.leaveType)))} leave.`,
        metadata: {
          before: { status: "PENDING" },
          after: { status: "APPROVED" },
        },
      })

      await enqueueDomainNotification(tx, {
        type: "LEAVE_APPROVED",
        organizationId,
        eventId: String(approved.id),
        actorUserId: membership.userId,
        staffId: String(existing.staffId),
        staffName: formatStaffName({
          firstName: String(staff.firstName),
          middleName: staff.middleName == null ? null : String(staff.middleName),
          lastName: String(staff.lastName),
        }),
        leaveTypeLabel: leaveTypePhrase(asLeaveType(String(existing.leaveType))),
        startDate: String(existing.startDate),
        endDate: String(existing.endDate),
      })

      return approved
    })

    await processDomainNotification({
      organizationId,
      type: "LEAVE_APPROVED",
      eventId: String(updated.id),
    })

    return updated
  } catch (error) {
    if (isLeaveError(error)) {
      throw error
    }

    throw leaveError("FAILED")
  }
}

export async function rejectLeave(leaveId: string) {
  const membership = await requireLeaveAccess(permissions.leaveReject)
  const organizationId = membership.organizationId

  try {
    const updated = await db.transaction(async (tx: TxClient) => {
      const existing = await findOwnedLeave(tx.orm, organizationId, leaveId)

      if (!existing) {
        throw leaveError("LEAVE_NOT_FOUND")
      }

      if (asLeaveStatus(existing.status) !== "PENDING") {
        throw leaveError("LEAVE_NOT_PENDING")
      }

      const staff = await tx.orm.public.StaffProfile.where({
        id: existing.staffId,
        organizationId,
      }).first()

      const rejected = await tx.orm.public.LeaveRequest.where({
        id: existing.id,
        organizationId,
        status: "PENDING",
      }).update({
        status: "REJECTED",
        reviewedByUserId: membership.userId,
        reviewedAt: Temporal.Now.instant(),
      })

      if (!rejected) {
        throw leaveError("LEAVE_NOT_PENDING")
      }

      leaveAuditPoint({
        type: "LEAVE_REJECTED",
        organizationId,
        leaveId: String(rejected.id),
        staffId: existing.staffId,
        actorUserId: membership.userId,
        previousStatus: "PENDING",
        newStatus: "REJECTED",
        occurredAt: Temporal.Now.instant(),
      })

      await recordUserAudit(tx, membership, {
        action: "LEAVE_REJECTED",
        entityType: "LEAVE_REQUEST",
        entityId: String(rejected.id),
        summary: `Rejected ${leaveTypePhrase(asLeaveType(String(existing.leaveType)))} leave.`,
        metadata: {
          before: { status: "PENDING" },
          after: { status: "REJECTED" },
        },
      })

      await enqueueDomainNotification(tx, {
        type: "LEAVE_REJECTED",
        organizationId,
        eventId: String(rejected.id),
        actorUserId: membership.userId,
        staffId: String(existing.staffId),
        staffName: staff
          ? formatStaffName({
              firstName: String(staff.firstName),
              middleName: staff.middleName == null ? null : String(staff.middleName),
              lastName: String(staff.lastName),
            })
          : "Unknown staff",
        leaveTypeLabel: leaveTypePhrase(asLeaveType(String(existing.leaveType))),
        startDate: String(existing.startDate),
        endDate: String(existing.endDate),
      })

      return rejected
    })

    await processDomainNotification({
      organizationId,
      type: "LEAVE_REJECTED",
      eventId: String(updated.id),
    })

    return updated
  } catch (error) {
    if (isLeaveError(error)) {
      throw error
    }

    throw leaveError("FAILED")
  }
}

export async function cancelLeave(leaveId: string) {
  const membership = await requireLeaveAccess(permissions.leaveView)
  const organizationId = membership.organizationId
  const [canApprove, canCreate] = await Promise.all([
    hasPermission(membership, permissions.leaveApprove),
    hasPermission(membership, permissions.leaveCreate),
  ])

  try {
    const cancelled = await db.transaction(async (tx: TxClient) => {
      const existing = await findOwnedLeave(tx.orm, organizationId, leaveId)

      if (!existing) {
        throw leaveError("LEAVE_NOT_FOUND")
      }

      const status = asLeaveStatus(existing.status)
      const linkedStaff = await findLinkedStaff(tx.orm, organizationId, membership.userId)
      const isOwn = Boolean(linkedStaff && linkedStaff.id === existing.staffId)

      if (status === "PENDING") {
        if (!isOwn && !canApprove) {
          throw leaveError("LEAVE_NOT_CANCELLABLE")
        }

        if (isOwn && !canCreate && !canApprove) {
          throw leaveError("FORBIDDEN")
        }
      } else if (status === "APPROVED") {
        if (!canApprove) {
          throw leaveError("LEAVE_NOT_CANCELLABLE")
        }
      } else {
        throw leaveError("LEAVE_NOT_CANCELLABLE")
      }

      const updated = await tx.orm.public.LeaveRequest.where({
        id: existing.id,
        organizationId,
        status,
      }).update({
        status: "CANCELLED",
        ...(canApprove && !isOwn
          ? {
              reviewedByUserId: membership.userId,
              reviewedAt: Temporal.Now.instant(),
            }
          : status === "APPROVED"
            ? {
                reviewedByUserId: membership.userId,
                reviewedAt: Temporal.Now.instant(),
              }
            : {}),
      })

      if (!updated) {
        throw leaveError("LEAVE_NOT_CANCELLABLE")
      }

      leaveAuditPoint({
        type: "LEAVE_CANCELLED",
        organizationId,
        leaveId: String(updated.id),
        staffId: existing.staffId,
        actorUserId: membership.userId,
        previousStatus: status,
        newStatus: "CANCELLED",
        occurredAt: Temporal.Now.instant(),
      })

      await recordUserAudit(tx, membership, {
        action: "LEAVE_CANCELLED",
        entityType: "LEAVE_REQUEST",
        entityId: String(updated.id),
        summary: `Cancelled ${leaveTypePhrase(asLeaveType(String(existing.leaveType)))} leave.`,
        metadata: {
          before: { status },
          after: { status: "CANCELLED" },
        },
      })

      const staff = await tx.orm.public.StaffProfile.where({
        id: existing.staffId,
        organizationId,
      }).first()

      await enqueueDomainNotification(tx, {
        type: "LEAVE_CANCELLED",
        organizationId,
        eventId: String(updated.id),
        actorUserId: membership.userId,
        staffId: String(existing.staffId),
        staffName: staff
          ? formatStaffName({
              firstName: String(staff.firstName),
              middleName: staff.middleName == null ? null : String(staff.middleName),
              lastName: String(staff.lastName),
            })
          : "Unknown staff",
        leaveTypeLabel: leaveTypePhrase(asLeaveType(String(existing.leaveType))),
        startDate: String(existing.startDate),
        endDate: String(existing.endDate),
      })

      return updated
    })

    await processDomainNotification({
      organizationId,
      type: "LEAVE_CANCELLED",
      eventId: String(cancelled.id),
    })

    return cancelled
  } catch (error) {
    if (isLeaveError(error)) {
      throw error
    }

    throw leaveError("FAILED")
  }
}
