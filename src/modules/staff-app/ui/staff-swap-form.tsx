"use client"

import { useActionState, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  createStaffSwapAction,
  type StaffSwapActionState,
} from "@/modules/staff-app/actions/swaps"
import type {
  SwapFormAssignment,
  SwapFormCandidate,
} from "@/modules/shift-swaps/services/swaps"
import {
  labelClassName,
  selectClassName,
  textareaClassName,
} from "@/modules/shift-swaps/ui/form-styles"
import { OfflineMutationNotice, useOfflineSubmitGuard } from "@/modules/staff-app/ui/offline-mutation"

export function StaffSwapForm({
  ownAssignments,
  candidatesBySourceId,
  defaultSourceAssignmentId,
}: {
  ownAssignments: SwapFormAssignment[]
  candidatesBySourceId: Record<string, SwapFormCandidate[]>
  defaultSourceAssignmentId?: string
}) {
  const [state, action, pending] = useActionState<StaffSwapActionState, FormData>(
    createStaffSwapAction,
    null,
  )
  const { online } = useOfflineSubmitGuard()
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
      <p className="text-sm text-muted-foreground">
        This request must be approved before the roster changes.
      </p>

      <div>
        <label className={labelClassName} htmlFor="staff-swap-source">
          Your shift
        </label>
        <select
          className={selectClassName}
          id="staff-swap-source"
          name="sourceAssignmentId"
          onChange={(event) => setSourceAssignmentId(event.target.value)}
          required
          value={sourceAssignmentId}
        >
          <option value="">Select your shift</option>
          {ownAssignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.dateLabel} · {assignment.shiftName} · {assignment.timeLabel}
            </option>
          ))}
        </select>
        {selected ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {selected.dateLabel} · {selected.shiftName} · {selected.timeLabel}
            <br />
            {selected.departmentName}
          </p>
        ) : null}
      </div>

      <div>
        <label className={labelClassName} htmlFor="staff-swap-target">
          Swap with
        </label>
        <select className={selectClassName} id="staff-swap-target" name="targetAssignmentId" required>
          <option value="">Select an eligible staff shift</option>
          {candidates.map((candidate) => (
            <option key={candidate.assignmentId} value={candidate.assignmentId}>
              {candidate.staffName} · {candidate.dateLabel} · {candidate.shiftName} ·{" "}
              {candidate.timeLabel}
            </option>
          ))}
        </select>
        {candidates.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            No eligible shifts are available to swap with on this roster.
          </p>
        ) : null}
      </div>

      <div>
        <label className={labelClassName} htmlFor="staff-swap-reason">
          Reason
        </label>
        <textarea className={textareaClassName} id="staff-swap-reason" name="reason" rows={3} />
      </div>

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <OfflineMutationNotice />

      <Button disabled={pending || !online || candidates.length === 0} size="lg" type="submit">
        {pending ? "Submitting..." : "Request swap"}
      </Button>
    </form>
  )
}
