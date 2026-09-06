"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  updateAccountAction,
  type AccountActionState,
} from "@/modules/organizations/actions/account"
import { inputClassName, labelClassName } from "@/modules/organizations/ui/form-styles"

export function AccountForm({ displayName, phone }: { displayName: string; phone: string }) {
  const [state, action, pending] = useActionState<AccountActionState, FormData>(
    updateAccountAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div>
        <label className={labelClassName} htmlFor="displayName">
          Display name
        </label>
        <input className={inputClassName} defaultValue={displayName} id="displayName" name="displayName" />
      </div>
      <div>
        <label className={labelClassName} htmlFor="phone">
          Phone
        </label>
        <input className={inputClassName} defaultValue={phone} id="phone" name="phone" />
      </div>
      {state?.ok === false ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.ok === true ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Saving..." : "Save account"}
      </Button>
    </form>
  )
}
