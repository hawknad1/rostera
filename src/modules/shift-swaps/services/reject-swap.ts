import { Temporal } from "temporal-polyfill"

import { permissions } from "@/lib/permissions/permissions"
import { swapError } from "@/modules/shift-swaps/errors"
import { assertSwapTransition } from "@/modules/shift-swaps/domain/status-transition"
import type { RejectSwapInput } from "@/modules/shift-swaps/schemas/swap"
import {
  asSwapStatus,
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

export async function rejectSwap(input: RejectSwapInput) {
  const membership = await requireSwapAccess(permissions.shiftSwapReject)
  const organizationId = membership.organizationId

  try {
    const updated = await db.transaction(async (tx: TxClient) => {
      const existing = await findOwnedSwap(tx.orm, organizationId, input.id)

      if (!existing) {
        throw swapError("SWAP_NOT_FOUND")
      }

      const status = asSwapStatus(existing.status)
      assertSwapTransition(status, "REJECTED")

      const rejected = await tx.orm.public.ShiftSwapRequest.where({
        id: existing.id,
        organizationId,
        status: "PENDING",
      }).update({
        status: "REJECTED",
        reviewedByUserId: membership.userId,
        reviewedAt: Temporal.Now.instant(),
        ...(input.reviewNotes ? { reviewNotes: input.reviewNotes } : {}),
      })

      if (!rejected) {
        throw swapError("SWAP_NOT_PENDING")
      }

      await enqueueDomainNotification(tx, {
        type: "SHIFT_SWAP_REJECTED",
        organizationId,
        eventId: String(rejected.id),
        actorUserId: membership.userId,
        requesterStaffId: String(existing.requesterStaffId),
        targetStaffId: String(existing.targetStaffId),
        requesterName: "A colleague",
      })

      return rejected
    })

    await processDomainNotification({
      organizationId,
      type: "SHIFT_SWAP_REJECTED",
      eventId: String(updated.id),
    })

    return updated
  } catch (error) {
    rethrowSwapError(error)
  }
}
