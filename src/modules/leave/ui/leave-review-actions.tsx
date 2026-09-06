"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  approveLeaveAction,
  type LeaveReviewActionState,
} from "@/modules/leave/actions/approve-leave"
import { cancelLeaveAction } from "@/modules/leave/actions/cancel-leave"
import { rejectLeaveAction } from "@/modules/leave/actions/reject-leave"

export function LeaveReviewActions({
  leaveId,
  status,
  canApprove,
  canReject,
  canCancel,
}: {
  leaveId: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
  canApprove: boolean
  canReject: boolean
  canCancel: boolean
}) {
  const [approveState, approve, approvePending] = useActionState<LeaveReviewActionState, FormData>(
    approveLeaveAction,
    null,
  )
  const [rejectState, reject, rejectPending] = useActionState<LeaveReviewActionState, FormData>(
    rejectLeaveAction,
    null,
  )
  const [cancelState, cancel, cancelPending] = useActionState<LeaveReviewActionState, FormData>(
    cancelLeaveAction,
    null,
  )

  const pending = approvePending || rejectPending || cancelPending
  const error = approveState?.error ?? rejectState?.error ?? cancelState?.error

  if (status === "REJECTED" || status === "CANCELLED") {
    return null
  }

  if (status === "APPROVED" && !canCancel) {
    return null
  }

  if (status === "PENDING" && !canApprove && !canReject && !canCancel) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {status === "PENDING" && canApprove ? (
          <form action={approve}>
            <input name="id" type="hidden" value={leaveId} />
            <Button disabled={pending} type="submit">
              {approvePending ? "Approving..." : "Approve"}
            </Button>
          </form>
        ) : null}
        {status === "PENDING" && canReject ? (
          <form action={reject}>
            <input name="id" type="hidden" value={leaveId} />
            <Button disabled={pending} type="submit" variant="destructive">
              {rejectPending ? "Rejecting..." : "Reject"}
            </Button>
          </form>
        ) : null}
        {canCancel ? (
          <form action={cancel}>
            <input name="id" type="hidden" value={leaveId} />
            <Button disabled={pending} type="submit" variant="outline">
              {cancelPending ? "Cancelling..." : "Cancel leave"}
            </Button>
          </form>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
