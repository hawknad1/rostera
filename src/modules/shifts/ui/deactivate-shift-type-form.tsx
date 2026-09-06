"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import type { ShiftActionState } from "@/modules/shifts/actions/create-shift-type"
import { deactivateShiftTypeAction } from "@/modules/shifts/actions/deactivate-shift-type"

export function DeactivateShiftTypeForm({
  isActive,
  shiftTypeId,
}: {
  isActive: boolean
  shiftTypeId: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [state, action, pending] = useActionState<ShiftActionState, FormData>(
    deactivateShiftTypeAction,
    null,
  )

  if (!isActive) {
    return (
      <p className="text-sm text-muted-foreground">
        This shift is inactive. It remains visible for administration and existing staffing
        requirements, but cannot be selected for new requirements.
      </p>
    )
  }

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(true)} type="button" variant="destructive">
        Deactivate shift
      </Button>
    )
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <input name="id" type="hidden" value={shiftTypeId} />
      <p className="text-sm text-muted-foreground">
        Deactivate this shift? It will no longer be available for new staffing requirements.
        Existing requirements will be kept.
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
