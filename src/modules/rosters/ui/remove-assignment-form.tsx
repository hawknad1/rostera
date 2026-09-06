"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import type { AssignmentActionState } from "@/modules/rosters/actions/create-assignment"
import { deleteAssignmentAction } from "@/modules/rosters/actions/delete-assignment"

export function RemoveAssignmentForm({ assignmentId }: { assignmentId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [state, action, pending] = useActionState<AssignmentActionState, FormData>(
    deleteAssignmentAction,
    null,
  )

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(true)} type="button" variant="outline">
        Remove
      </Button>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="id" type="hidden" value={assignmentId} />
      <p className="text-sm text-muted-foreground">Remove this assignment from the draft roster?</p>
      {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => setConfirming(false)} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={pending} type="submit" variant="destructive">
          {pending ? "Removing..." : "Remove"}
        </Button>
      </div>
    </form>
  )
}
