"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import type { DepartmentActionState } from "@/modules/departments/actions/create-department"
import { deleteDepartmentAction } from "@/modules/departments/actions/delete-department"

export function DeleteDepartmentForm({ departmentId }: { departmentId: string }) {
  const [state, action, pending] = useActionState<DepartmentActionState, FormData>(
    deleteDepartmentAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <input name="id" type="hidden" value={departmentId} />
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button className="self-start" disabled={pending} type="submit" variant="destructive">
        {pending ? "Deleting..." : "Delete department"}
      </Button>
    </form>
  )
}
