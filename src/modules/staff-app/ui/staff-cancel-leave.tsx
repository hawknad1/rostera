"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  cancelStaffLeaveAction,
  type StaffLeaveActionState,
} from "@/modules/staff-app/actions/leave"
import { OfflineMutationNotice, useOfflineSubmitGuard } from "@/modules/staff-app/ui/offline-mutation"

export function StaffCancelLeaveButton({ leaveId }: { leaveId: string }) {
  const [state, action, pending] = useActionState<StaffLeaveActionState, FormData>(
    cancelStaffLeaveAction,
    null,
  )
  const { online } = useOfflineSubmitGuard()

  return (
    <form action={action} className="flex flex-col gap-2">
      <input name="id" type="hidden" value={leaveId} />
      <OfflineMutationNotice />
      <Button disabled={pending || !online} type="submit" variant="outline">
        {pending ? "Cancelling..." : "Cancel request"}
      </Button>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
