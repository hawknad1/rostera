import { Temporal } from "temporal-polyfill"

import { isExclusionConstraintViolation } from "@/lib/db/exclusion-constraint"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { permissions } from "@/lib/permissions/permissions"
import { swapError } from "@/modules/shift-swaps/errors"
import { assertSwapTransition } from "@/modules/shift-swaps/domain/status-transition"
import {
  asSwapStatus,
  findOwnedSwap,
  rethrowSwapError,
  requireSwapAccess,
  type TxClient,
} from "@/modules/shift-swaps/services/access"
import { shiftSwapAuditPoint } from "@/modules/shift-swaps/services/audit"
import {
  assertDistinctStaff,
  assertRosterCompletable,
  assertSameDepartment,
  assertSameRoster,
  assertStaffEligibleForSwap,
  assertSwapAssignmentsMatchStaff,
  assertSwapTenancy,
} from "@/modules/shift-swaps/services/eligibility"
import {
  simulateSwapAssignments,
  throwIfSwapBlocked,
} from "@/modules/shift-swaps/services/validation"
import { db } from "@/prisma/db"

export async function approveSwap(swapId: string) {
  const membership = await requireSwapAccess(permissions.shiftSwapApprove)
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)

  try {
    return await db.transaction(async (tx: TxClient) => {
      const existing = await findOwnedSwap(tx.orm, organizationId, swapId)

      if (!existing) {
        throw swapError("SWAP_NOT_FOUND")
      }

      const status = asSwapStatus(existing.status)
      assertSwapTransition(status, "COMPLETED")

      const source = await tx.orm.public.ShiftAssignment.where({
        id: existing.sourceAssignmentId,
        organizationId,
        staffId: existing.requesterStaffId,
      }).first()

      const target = await tx.orm.public.ShiftAssignment.where({
        id: existing.targetAssignmentId,
        organizationId,
        staffId: existing.targetStaffId,
      }).first()

      if (!source || !target) {
        throw swapError("SWAP_STATE_CHANGED")
      }

      assertSwapTenancy(organizationId, [existing, source, target])

      if (source.rosterId !== existing.rosterId || target.rosterId !== existing.rosterId) {
        throw swapError("SWAP_STATE_CHANGED")
      }

      const roster = await tx.orm.public.Roster.where({
        id: existing.rosterId,
        organizationId,
      }).first()

      if (!roster) {
        throw swapError("SWAP_STATE_CHANGED")
      }

      assertRosterCompletable(roster)

      const requester = await tx.orm.public.StaffProfile.where({
        id: existing.requesterStaffId,
        organizationId,
      }).first()

      const targetStaff = await tx.orm.public.StaffProfile.where({
        id: existing.targetStaffId,
        organizationId,
      }).first()

      if (!requester || !targetStaff) {
        throw swapError("SWAP_STATE_CHANGED")
      }

      assertSwapAssignmentsMatchStaff(source, target, requester, targetStaff)
      assertSameRoster(source, target)
      assertSameDepartment(source, target)
      assertDistinctStaff(requester, targetStaff)
      assertStaffEligibleForSwap(requester, source.departmentId)
      assertStaffEligibleForSwap(targetStaff, source.departmentId)

      const simulation = await simulateSwapAssignments(tx.orm, {
        organizationId,
        timeZone,
        roster,
        source,
        target,
        requester,
        targetStaff,
      })
      throwIfSwapBlocked(simulation)

      const updatedSource = await tx.orm.public.ShiftAssignment.where({
        id: source.id,
        organizationId,
        staffId: requester.id,
        rosterId: roster.id,
      }).update({
        staffId: targetStaff.id,
        professionId: targetStaff.professionId,
      })

      const updatedTarget = await tx.orm.public.ShiftAssignment.where({
        id: target.id,
        organizationId,
        staffId: targetStaff.id,
        rosterId: roster.id,
      }).update({
        staffId: requester.id,
        professionId: requester.professionId,
      })

      if (!updatedSource || !updatedTarget) {
        throw swapError("SWAP_STATE_CHANGED")
      }

      const completed = await tx.orm.public.ShiftSwapRequest.where({
        id: existing.id,
        organizationId,
        status: "PENDING",
      }).update({
        status: "COMPLETED",
        reviewedByUserId: membership.userId,
        reviewedAt: Temporal.Now.instant(),
        completedAt: Temporal.Now.instant(),
      })

      if (!completed) {
        throw swapError("SWAP_STATE_CHANGED")
      }

      shiftSwapAuditPoint({
        type: "SHIFT_SWAP_COMPLETED",
        organizationId,
        swapId: String(completed.id),
        sourceAssignmentId: source.id,
        targetAssignmentId: target.id,
        previousSourceStaffId: requester.id,
        previousTargetStaffId: targetStaff.id,
        completedByUserId: membership.userId,
        timestamp: Temporal.Now.instant(),
      })

      return completed
    })
  } catch (error) {
    if (isExclusionConstraintViolation(error) || isUniqueConstraintViolation(error)) {
      throw swapError("SWAP_SCHEDULING_CONFLICT")
    }

    rethrowSwapError(error)
  }
}
