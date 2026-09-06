"use client"

import { useActionState, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  createSwapAction,
  type SwapActionState,
} from "@/modules/shift-swaps/actions/create-swap"
import type {
  SwapFormAssignment,
  SwapFormCandidate,
} from "@/modules/shift-swaps/services/swaps"
import {
  labelClassName,
  selectClassName,
  textareaClassName,
} from "@/modules/shift-swaps/ui/form-styles"

export function CreateSwapForm({
  ownAssignments,
  candidatesBySourceId,
  defaultSourceAssignmentId,
}: {
  ownAssignments: SwapFormAssignment[]
  candidatesBySourceId: Record<string, SwapFormCandidate[]>
  defaultSourceAssignmentId?: string
}) {
  const [state, action, pending] = useActionState<SwapActionState, FormData>(
    createSwapAction,
    null,
  )
  const [sourceAssignmentId, setSourceAssignmentId] = useState(
    defaultSourceAssignmentId && ownAssignments.some((row) => row.id === defaultSourceAssignmentId)
      ? defaultSourceAssignmentId
      : (ownAssignments[0]?.id ?? ""),
  )

  const selected = ownAssignments.find((row) => row.id === sourceAssignmentId)
  const candidates = useMemo(
    () => candidatesBySourceId[sourceAssignmentId] ?? [],
    [candidatesBySourceId, sourceAssignmentId],
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div>
        <label className={labelClassName} htmlFor="swap-source">
          Your shift
        </label>
        <select
          className={selectClassName}
          id="swap-source"
          name="sourceAssignmentId"
          onChange={(event) => setSourceAssignmentId(event.target.value)}
          required
          value={sourceAssignmentId}
        >
          <option value="">Select your shift</option>
          {ownAssignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.dateLabel} · {assignment.shiftName} · {assignment.timeLabel} ·{" "}
              {assignment.rosterName}
            </option>
          ))}
        </select>
        {selected ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {selected.departmentName} · {selected.rosterName}
          </p>
        ) : null}
      </div>

      <div>
        <label className={labelClassName} htmlFor="swap-target">
          Swap with
        </label>
        <select className={selectClassName} id="swap-target" name="targetAssignmentId" required>
          <option value="">Select an eligible staff member</option>
          {candidates.map((candidate) => (
            <option key={candidate.assignmentId} value={candidate.assignmentId}>
              {candidate.staffName} · {candidate.dateLabel} · {candidate.shiftName} ·{" "}
              {candidate.timeLabel}
            </option>
          ))}
        </select>
        {sourceAssignmentId && candidates.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            No eligible staff currently have a matching assignment on this roster.
          </p>
        ) : null}
      </div>

      <div>
        <label className={labelClassName} htmlFor="swap-reason">
          Reason
        </label>
        <textarea className={textareaClassName} id="swap-reason" name="reason" />
        <p className="mt-1.5 text-xs text-muted-foreground">Optional.</p>
      </div>

      <p className="text-sm text-muted-foreground">
        The swap will only take effect after approval and successful schedule validation.
      </p>

      {state?.error ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-destructive">{state.error}</p>
          {state.conflicts?.map((conflict) => (
            <p className="text-sm text-destructive" key={conflict.message}>
              {conflict.message}
            </p>
          ))}
        </div>
      ) : null}

      <Button className="self-start" disabled={pending || !sourceAssignmentId} type="submit">
        {pending ? "Submitting..." : "Request swap"}
      </Button>
    </form>
  )
}
