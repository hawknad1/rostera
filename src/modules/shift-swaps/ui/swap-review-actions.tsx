"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  approveSwapAction,
  type SwapReviewActionState,
} from "@/modules/shift-swaps/actions/approve-swap"
import { cancelSwapAction } from "@/modules/shift-swaps/actions/cancel-swap"
import { rejectSwapAction } from "@/modules/shift-swaps/actions/reject-swap"
import { labelClassName, textareaClassName } from "@/modules/shift-swaps/ui/form-styles"

export function SwapReviewActions({
  swapId,
  status,
  canApprove,
  canReject,
  canCancel,
}: {
  swapId: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED"
  canApprove: boolean
  canReject: boolean
  canCancel: boolean
}) {
  const [approveState, approve, approvePending] = useActionState<SwapReviewActionState, FormData>(
    approveSwapAction,
    null,
  )
  const [rejectState, reject, rejectPending] = useActionState<SwapReviewActionState, FormData>(
    rejectSwapAction,
    null,
  )
  const [cancelState, cancel, cancelPending] = useActionState<
    { ok: false; error: string; code?: string } | null,
    FormData
  >(cancelSwapAction, null)

  const pending = approvePending || rejectPending || cancelPending
  const error = approveState?.error ?? rejectState?.error ?? cancelState?.error
  const conflicts = approveState?.conflicts ?? []

  if (status !== "PENDING") {
    return null
  }

  if (!canApprove && !canReject && !canCancel) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {canApprove ? (
          <form action={approve}>
            <input name="id" type="hidden" value={swapId} />
            <Button disabled={pending} type="submit">
              {approvePending ? "Approving..." : "Approve swap"}
            </Button>
          </form>
        ) : null}
        {canCancel ? (
          <form action={cancel}>
            <input name="id" type="hidden" value={swapId} />
            <Button disabled={pending} type="submit" variant="outline">
              {cancelPending ? "Cancelling..." : "Cancel request"}
            </Button>
          </form>
        ) : null}
      </div>
      {canReject ? (
        <form action={reject} className="flex max-w-xl flex-col gap-3">
          <input name="id" type="hidden" value={swapId} />
          <div>
            <label className={labelClassName} htmlFor="swap-review-notes">
              Rejection reason
            </label>
            <textarea className={textareaClassName} id="swap-review-notes" name="reviewNotes" />
            <p className="mt-1.5 text-xs text-muted-foreground">Optional.</p>
          </div>
          <Button className="self-start" disabled={pending} type="submit" variant="destructive">
            {rejectPending ? "Rejecting..." : "Reject swap"}
          </Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {conflicts.map((conflict) => (
        <p className="text-sm text-destructive" key={conflict.message}>
          {conflict.message}
        </p>
      ))}
    </div>
  )
}
