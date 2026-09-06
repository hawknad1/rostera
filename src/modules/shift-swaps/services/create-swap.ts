import type { CreateSwapInput } from "@/modules/shift-swaps/schemas/swap"
import { swapError } from "@/modules/shift-swaps/errors"
import {
  assertAssignmentsNotInActiveSwap,
  findLinkedStaff,
  rethrowSwapError,
  requireSwapAccess,
  type TxClient,
} from "@/modules/shift-swaps/services/access"
import {
  assertDistinctStaff,
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
import { permissions } from "@/lib/permissions/permissions"
import {
  enqueueDomainNotification,
  processDomainNotification,
} from "@/modules/notifications/services/emit"
import { formatStaffName } from "@/modules/staff/labels"
import { db } from "@/prisma/db"

export async function createSwap(input: CreateSwapInput) {
  const membership = await requireSwapAccess(permissions.shiftSwapRequest)
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)

  try {
    const created = await db.transaction(async (tx: TxClient) => {
      const requester = await findLinkedStaff(tx.orm, organizationId, membership.userId)

      if (!requester) {
        throw swapError("STAFF_NOT_LINKED")
      }

      if (requester.organizationId !== organizationId) {
        throw swapError("STAFF_NOT_LINKED")
      }

      const source = await tx.orm.public.ShiftAssignment.where({
        id: input.sourceAssignmentId,
        organizationId,
      }).first()

      const target = await tx.orm.public.ShiftAssignment.where({
        id: input.targetAssignmentId,
        organizationId,
      }).first()

      if (!source || !target) {
        throw swapError("SWAP_NOT_FOUND")
      }

      assertSwapTenancy(organizationId, [source, target])

      if (source.staffId !== requester.id) {
        throw swapError("SWAP_NOT_YOURS")
      }

      const targetStaff = await tx.orm.public.StaffProfile.where({
        id: target.staffId,
        organizationId,
      }).first()

      if (!targetStaff || targetStaff.organizationId !== organizationId) {
        throw swapError("SWAP_NOT_ELIGIBLE")
      }

      const roster = await tx.orm.public.Roster.where({
        id: source.rosterId,
        organizationId,
      }).first()

      if (!roster || roster.organizationId !== organizationId) {
        throw swapError("SWAP_NOT_FOUND")
      }

      assertSwapAssignmentsMatchStaff(source, target, requester, targetStaff)
      assertSameRoster(source, target)
      assertSameDepartment(source, target)
      assertDistinctStaff(requester, targetStaff)
      assertStaffEligibleForSwap(requester, source.departmentId)
      assertStaffEligibleForSwap(targetStaff, source.departmentId)

      await assertAssignmentsNotInActiveSwap(tx.orm, organizationId, [source.id, target.id])

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

      const created = await tx.orm.public.ShiftSwapRequest.create({
        organizationId,
        rosterId: source.rosterId,
        departmentId: source.departmentId,
        sourceAssignmentId: source.id,
        targetAssignmentId: target.id,
        requesterStaffId: requester.id,
        targetStaffId: targetStaff.id,
        status: "PENDING",
        requestedByUserId: membership.userId,
        ...(input.reason ? { reason: input.reason } : {}),
      })

      await enqueueDomainNotification(tx, {
        type: "SHIFT_SWAP_REQUESTED",
        organizationId,
        eventId: String(created.id),
        actorUserId: membership.userId,
        requesterStaffId: String(requester.id),
        targetStaffId: String(targetStaff.id),
        requesterName: formatStaffName({
          firstName: String(requester.firstName),
          middleName: requester.middleName == null ? null : String(requester.middleName),
          lastName: String(requester.lastName),
        }),
      })

      return created
    })

    await processDomainNotification({
      organizationId,
      type: "SHIFT_SWAP_REQUESTED",
      eventId: String(created.id),
    })

    return created
  } catch (error) {
    rethrowSwapError(error)
  }
}
