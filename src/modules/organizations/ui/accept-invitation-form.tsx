"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  acceptInvitationAction,
  type AcceptInvitationState,
} from "@/modules/organizations/actions/accept-invitation"

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AcceptInvitationState, FormData>(
    acceptInvitationAction,
    null,
  )

  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="token" type="hidden" value={token} />
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Accepting..." : "Accept invitation"}
      </Button>
    </form>
  )
}
