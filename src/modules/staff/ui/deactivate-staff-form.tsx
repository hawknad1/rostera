"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import type { StaffActionState } from "@/modules/staff/actions/create-staff"
import { deactivateStaffAction } from "@/modules/staff/actions/deactivate-staff"

export function DeactivateStaffForm({
  staffId,
  isTerminated,
}: {
  staffId: string
  isTerminated: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const [state, action, pending] = useActionState<StaffActionState, FormData>(
    deactivateStaffAction,
    null,
  )

  if (isTerminated) {
    return <p className="text-sm text-muted-foreground">This staff member is already terminated.</p>
  }

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(true)} type="button" variant="destructive">
        Deactivate staff member
      </Button>
    )
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <input name="id" type="hidden" value={staffId} />
      <p className="text-sm text-muted-foreground">
        Deactivate staff member? This will mark the staff member as terminated. Their historical
        records will be preserved.
      </p>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => setConfirming(false)} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={pending} type="submit" variant="destructive">
          {pending ? "Deactivating..." : "Deactivate"}
        </Button>
      </div>
    </form>
  )
}
