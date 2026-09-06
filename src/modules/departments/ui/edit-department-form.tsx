"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { updateDepartmentAction } from "@/modules/departments/actions/update-department"
import type { DepartmentActionState } from "@/modules/departments/actions/create-department"
import { inputClassName, labelClassName } from "@/modules/departments/ui/form-styles"

export function EditDepartmentForm({
  department,
}: {
  department: {
    id: string
    name: string
    description: string | null
  }
}) {
  const [state, action, pending] = useActionState<DepartmentActionState, FormData>(
    updateDepartmentAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <input name="id" type="hidden" value={department.id} />

      <div>
        <label className={labelClassName} htmlFor="edit-department-name">
          Name
        </label>
        <input
          className={inputClassName}
          defaultValue={department.name}
          id="edit-department-name"
          name="name"
          required
          type="text"
        />
      </div>

      <div>
        <label className={labelClassName} htmlFor="edit-department-description">
          Description
        </label>
        <input
          className={inputClassName}
          defaultValue={department.description ?? ""}
          id="edit-department-description"
          name="description"
          type="text"
        />
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  )
}
