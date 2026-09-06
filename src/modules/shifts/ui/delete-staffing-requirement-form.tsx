"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import type { StaffingRequirementActionState } from "@/modules/shifts/actions/create-staffing-requirement"
import { deleteStaffingRequirementAction } from "@/modules/shifts/actions/delete-staffing-requirement"

export function DeleteStaffingRequirementForm({ requirementId }: { requirementId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [state, action, pending] = useActionState<StaffingRequirementActionState, FormData>(
    deleteStaffingRequirementAction,
    null,
  )

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(true)} type="button" variant="outline">
        Delete
      </Button>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="id" type="hidden" value={requirementId} />
      <p className="text-sm text-muted-foreground">
        Delete this staffing requirement? This removes the configured headcount for this department,
        shift, and profession.
      </p>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => setConfirming(false)} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={pending} type="submit" variant="destructive">
          {pending ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </form>
  )
}
