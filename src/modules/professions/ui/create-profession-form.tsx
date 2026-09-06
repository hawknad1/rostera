"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  createProfessionAction,
  type ProfessionActionState,
} from "@/modules/professions/actions/create-profession"
import { inputClassName, labelClassName } from "@/modules/professions/ui/form-styles"

export function CreateProfessionForm() {
  const [state, action, pending] = useActionState<ProfessionActionState, FormData>(
    createProfessionAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div>
        <label className={labelClassName} htmlFor="profession-name">
          Name
        </label>
        <input
          className={inputClassName}
          id="profession-name"
          name="name"
          required
          type="text"
        />
      </div>

      <div>
        <label className={labelClassName} htmlFor="profession-description">
          Description
        </label>
        <input
          className={inputClassName}
          id="profession-description"
          name="description"
          type="text"
        />
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Creating..." : "Create profession"}
      </Button>
    </form>
  )
}
