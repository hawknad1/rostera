"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  reviewAttendanceAction,
  type AttendanceReviewState,
} from "@/modules/attendance/actions/approve"
import { labelClassName, textareaClassName } from "@/modules/leave/ui/form-styles"

export function AttendanceReviewActions({
  recordId,
  canApprove,
  canVoid,
}: {
  recordId: string
  canApprove: boolean
  canVoid: boolean
}) {
  const [state, action, pending] = useActionState<AttendanceReviewState, FormData>(
    reviewAttendanceAction,
    null,
  )

  if (!canApprove && !canVoid) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {canApprove ? (
        <form action={action} className="flex flex-col gap-3">
          <input name="id" type="hidden" value={recordId} />
          <div>
            <label className={labelClassName} htmlFor="attendance-review-notes">
              Notes
            </label>
            <textarea className={textareaClassName} id="attendance-review-notes" name="notes" rows={3} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} name="decision" type="submit" value="APPROVE">
              Approve
            </Button>
            <Button
              disabled={pending}
              name="decision"
              type="submit"
              value="REJECT"
              variant="outline"
            >
              Reject
            </Button>
          </div>
        </form>
      ) : null}
      {canVoid ? (
        <form action={action} className="flex flex-col gap-3">
          <input name="id" type="hidden" value={recordId} />
          <input name="decision" type="hidden" value="VOID" />
          <div>
            <label className={labelClassName} htmlFor="attendance-void-notes">
              Void reason
            </label>
            <textarea className={textareaClassName} id="attendance-void-notes" name="notes" rows={3} />
          </div>
          <Button disabled={pending} type="submit" variant="outline">
            Void record
          </Button>
        </form>
      ) : null}
    </div>
  )
}
