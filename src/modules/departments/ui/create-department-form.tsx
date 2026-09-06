"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  createDepartmentAction,
  type DepartmentActionState,
} from "@/modules/departments/actions/create-department"
import { inputClassName, labelClassName } from "@/modules/departments/ui/form-styles"

export function CreateDepartmentForm() {
  const [state, action, pending] = useActionState<DepartmentActionState, FormData>(
    createDepartmentAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div>
        <label className={labelClassName} htmlFor="department-name">
          Name
        </label>
        <input
          className={inputClassName}
          id="department-name"
          name="name"
          required
          type="text"
        />
      </div>

      <div>
        <label className={labelClassName} htmlFor="department-description">
          Description
        </label>
        <input
          className={inputClassName}
          id="department-description"
          name="description"
          type="text"
        />
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Creating..." : "Create department"}
      </Button>
    </form>
  )
}
