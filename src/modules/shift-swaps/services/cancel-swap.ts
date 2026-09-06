import { permissions } from "@/lib/permissions/permissions"
import { swapError } from "@/modules/shift-swaps/errors"
import { assertSwapTransition } from "@/modules/shift-swaps/domain/status-transition"
import {
  asSwapStatus,
  findLinkedStaff,
  findOwnedSwap,
  rethrowSwapError,
  requireSwapAccess,
  type TxClient,
} from "@/modules/shift-swaps/services/access"
import {
  enqueueDomainNotification,
  processDomainNotification,
} from "@/modules/notifications/services/emit"
import { db } from "@/prisma/db"

export async function cancelSwap(swapId: string) {
  const membership = await requireSwapAccess(permissions.shiftSwapRequest)
  const organizationId = membership.organizationId

  try {
    const updated = await db.transaction(async (tx: TxClient) => {
      const existing = await findOwnedSwap(tx.orm, organizationId, swapId)

      if (!existing) {
        throw swapError("SWAP_NOT_FOUND")
      }

      const linkedStaff = await findLinkedStaff(tx.orm, organizationId, membership.userId)

      if (!linkedStaff || linkedStaff.id !== existing.requesterStaffId) {
        throw swapError("SWAP_NOT_YOURS")
      }

      const status = asSwapStatus(existing.status)
      assertSwapTransition(status, "CANCELLED")

      const cancelled = await tx.orm.public.ShiftSwapRequest.where({
        id: existing.id,
        organizationId,
        status: "PENDING",
      }).update({
        status: "CANCELLED",
      })

      if (!cancelled) {
        throw swapError("SWAP_NOT_PENDING")
      }

      await enqueueDomainNotification(tx, {
        type: "SHIFT_SWAP_CANCELLED",
        organizationId,
        eventId: String(cancelled.id),
        actorUserId: membership.userId,
        requesterStaffId: String(existing.requesterStaffId),
        targetStaffId: String(existing.targetStaffId),
        requesterName: "A colleague",
      })

      return cancelled
    })

    await processDomainNotification({
      organizationId,
      type: "SHIFT_SWAP_CANCELLED",
      eventId: String(updated.id),
    })

    return updated
  } catch (error) {
    rethrowSwapError(error)
  }
}
