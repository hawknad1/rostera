"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { deleteRosterAction } from "@/modules/rosters/actions/delete-roster"
import type { RosterLifecycleActionState } from "@/modules/rosters/actions/lifecycle-state"
import { publishRosterAction } from "@/modules/rosters/actions/publish-roster"
import { returnRosterToDraftAction } from "@/modules/rosters/actions/return-roster-to-draft"
import { submitRosterForReviewAction } from "@/modules/rosters/actions/submit-roster-for-review"
import { validateRosterAction } from "@/modules/rosters/actions/validate-roster"
import type { RosterStatus } from "@/modules/rosters/labels"

function ActionError({ state }: { state: RosterLifecycleActionState }) {
  if (!state || state.ok !== false) {
    return null
  }

  return <p className="text-sm text-destructive">{state.error}</p>
}

function ValidateRosterButton({ rosterId }: { rosterId: string }) {
  const [state, action, pending] = useActionState<RosterLifecycleActionState, FormData>(
    validateRosterAction,
    null,
  )

  return (
    <form action={action} className="flex flex-col gap-2">
      <input name="id" type="hidden" value={rosterId} />
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? "Validating..." : "Validate roster"}
      </Button>
      <ActionError state={state} />
    </form>
  )
}

function SubmitForReviewButton({ rosterId }: { rosterId: string }) {
  const [state, action, pending] = useActionState<RosterLifecycleActionState, FormData>(
    submitRosterForReviewAction,
    null,
  )

  return (
    <form action={action} className="flex flex-col gap-2">
      <input name="id" type="hidden" value={rosterId} />
      <Button disabled={pending} type="submit">
        {pending ? "Submitting..." : "Submit for review"}
      </Button>
      <ActionError state={state} />
    </form>
  )
}

function ReturnToDraftButton({ rosterId }: { rosterId: string }) {
  const [state, action, pending] = useActionState<RosterLifecycleActionState, FormData>(
    returnRosterToDraftAction,
    null,
  )

  return (
    <form action={action} className="flex flex-col gap-2">
      <input name="id" type="hidden" value={rosterId} />
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? "Returning..." : "Return to draft"}
      </Button>
      <ActionError state={state} />
    </form>
  )
}

function PublishRosterButton({ rosterId }: { rosterId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [state, action, pending] = useActionState<RosterLifecycleActionState, FormData>(
    publishRosterAction,
    null,
  )

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(true)} type="button">
        Publish roster
      </Button>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="id" type="hidden" value={rosterId} />
      <p className="text-sm text-muted-foreground">
        Publish this roster? Published rosters cannot be edited.
      </p>
      <ActionError state={state} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => setConfirming(false)} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={pending} type="submit">
          {pending ? "Publishing..." : "Publish roster"}
        </Button>
      </div>
    </form>
  )
}

function DeleteDraftButton({ rosterId }: { rosterId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [state, action, pending] = useActionState<RosterLifecycleActionState, FormData>(
    deleteRosterAction,
    null,
  )

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(true)} type="button" variant="outline">
        Delete draft
      </Button>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="id" type="hidden" value={rosterId} />
      <p className="text-sm text-muted-foreground">
        Delete this draft roster and its assignments? This cannot be undone.
      </p>
      <ActionError state={state} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => setConfirming(false)} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={pending} type="submit" variant="destructive">
          {pending ? "Deleting..." : "Delete draft"}
        </Button>
      </div>
    </form>
  )
}

export function RosterLifecycleActions({
  rosterId,
  status,
  canEdit,
  canReview,
  canPublish,
}: {
  rosterId: string
  status: RosterStatus
  canEdit: boolean
  canReview: boolean
  canPublish: boolean
}) {
  if (status === "PUBLISHED" || status === "AMENDED") {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <ValidateRosterButton rosterId={rosterId} />
        {status === "DRAFT" && canReview ? <SubmitForReviewButton rosterId={rosterId} /> : null}
        {status === "IN_REVIEW" && canReview ? <ReturnToDraftButton rosterId={rosterId} /> : null}
        {status === "IN_REVIEW" && canPublish ? <PublishRosterButton rosterId={rosterId} /> : null}
        {status === "DRAFT" && canEdit ? <DeleteDraftButton rosterId={rosterId} /> : null}
      </div>
    </div>
  )
}
