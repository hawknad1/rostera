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
import { db } from "@/prisma/db"

export async function rejectSwap(input: RejectSwapInput) {
  const membership = await requireSwapAccess(permissions.shiftSwapReject)
  const organizationId = membership.organizationId

  try {
    return await db.transaction(async (tx: TxClient) => {
      const existing = await findOwnedSwap(tx.orm, organizationId, input.id)

      if (!existing) {
        throw swapError("SWAP_NOT_FOUND")
      }

      const status = asSwapStatus(existing.status)
      assertSwapTransition(status, "REJECTED")

      const updated = await tx.orm.public.ShiftSwapRequest.where({
        id: existing.id,
        organizationId,
        status: "PENDING",
      }).update({
        status: "REJECTED",
        reviewedByUserId: membership.userId,
        reviewedAt: Temporal.Now.instant(),
        ...(input.reviewNotes ? { reviewNotes: input.reviewNotes } : {}),
      })

      if (!updated) {
        throw swapError("SWAP_NOT_PENDING")
      }

      return updated
    })
  } catch (error) {
    rethrowSwapError(error)
  }
}
