"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  createInvitationAction,
  type InvitationActionState,
} from "@/modules/organizations/actions/invitations"
import { inputClassName, labelClassName, selectClassName } from "@/modules/organizations/ui/form-styles"

export function InviteUserForm({
  roles,
}: {
  roles: Array<{ id: string; name: string }>
}) {
  const [state, action, pending] = useActionState<InvitationActionState, FormData>(
    createInvitationAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <div>
        <label className={labelClassName} htmlFor="email">
          Email
        </label>
        <input className={inputClassName} id="email" name="email" required type="email" />
      </div>
      <div>
        <label className={labelClassName} htmlFor="roleId">
          Role
        </label>
        <select className={selectClassName} id="roleId" name="roleId" required>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>
      {state?.ok === false ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.ok === true ? <p className="text-sm text-muted-foreground">Invitation sent.</p> : null}
      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Sending..." : "Send invitation"}
      </Button>
    </form>
  )
}
