import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { isSwapError, swapError } from "@/modules/shift-swaps/errors"
import { isSwapStatus, type SwapStatus } from "@/modules/shift-swaps/labels"
import { db } from "@/prisma/db"

export type PublicOrm = typeof db.orm
export type TxClient = { orm: PublicOrm }

export async function requireSwapAccess(permission: Permission) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw swapError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permission)

  if (!authorized) {
    throw swapError("FORBIDDEN")
  }

  return membership
}

export async function isStaffSelfService(membership: {
  roleId: string
  organizationId: string
}) {
  const [canRequest, canApprove] = await Promise.all([
    hasPermission(membership, permissions.shiftSwapRequest),
    hasPermission(membership, permissions.shiftSwapApprove),
  ])

  return canRequest && !canApprove
}

export async function findLinkedStaff(orm: PublicOrm, organizationId: string, userId: string) {
  return orm.public.StaffProfile.where({
    organizationId,
    userId,
  }).first()
}

export async function findOwnedSwap(orm: PublicOrm, organizationId: string, swapId: string) {
  return orm.public.ShiftSwapRequest.where({
    id: swapId,
    organizationId,
  }).first()
}

export function asSwapStatus(value: string): SwapStatus {
  if (isSwapStatus(value)) {
    return value
  }

  return "PENDING"
}

export function actorLabel(user: { email?: string | null; phone?: string | null } | null) {
  if (!user) {
    return "Unknown user"
  }

  return user.email || user.phone || "Unknown user"
}

export function formatTimeLabel(assignment: {
  shiftStartTime: string
  shiftEndTime: string
  isOvernight: boolean
}) {
  return `${assignment.shiftStartTime}–${assignment.shiftEndTime}${
    assignment.isOvernight ? " (following day)" : ""
  }`
}

export async function loadPendingSwapsForAssignments(
  orm: PublicOrm,
  organizationId: string,
  assignmentIds: readonly string[],
) {
  if (assignmentIds.length === 0) {
    return []
  }

  const ids = new Set(assignmentIds)
  const pending = await orm.public.ShiftSwapRequest.where({
    organizationId,
    status: "PENDING",
  }).all()

  return pending.filter(
    (row) =>
      row.organizationId === organizationId &&
      asSwapStatus(row.status) === "PENDING" &&
      (ids.has(row.sourceAssignmentId) || ids.has(row.targetAssignmentId)),
  )
}

export async function assertAssignmentsNotInActiveSwap(
  orm: PublicOrm,
  organizationId: string,
  assignmentIds: readonly string[],
  ignoreSwapId?: string,
) {
  const pending = await loadPendingSwapsForAssignments(orm, organizationId, assignmentIds)
  const conflicting = pending.some((row) => row.id !== ignoreSwapId)

  if (conflicting) {
    throw swapError("SWAP_ASSIGNMENT_ALREADY_IN_SWAP")
  }
}

export function rethrowSwapError(error: unknown): never {
  if (isSwapError(error)) {
    throw error
  }

  throw swapError("FAILED")
}
