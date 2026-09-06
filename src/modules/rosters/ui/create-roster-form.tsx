"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  createRosterAction,
  type RosterActionState,
} from "@/modules/rosters/actions/create-roster"
import { inputClassName, labelClassName, selectClassName } from "@/modules/rosters/ui/form-styles"

export function CreateRosterForm({
  departments,
}: {
  departments: { id: string; name: string }[]
}) {
  const [state, action, pending] = useActionState<RosterActionState, FormData>(
    createRosterAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div>
        <label className={labelClassName} htmlFor="roster-name">
          Roster name
        </label>
        <input
          className={inputClassName}
          id="roster-name"
          name="name"
          placeholder="September 2026 — Emergency Department"
          required
          type="text"
        />
      </div>

      <div>
        <label className={labelClassName} htmlFor="roster-department">
          Department
        </label>
        <select className={selectClassName} id="roster-department" name="departmentId" required>
          <option value="">Select a department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="roster-start">
            Start date
          </label>
          <input className={inputClassName} id="roster-start" name="startDate" required type="date" />
        </div>
        <div>
          <label className={labelClassName} htmlFor="roster-end">
            End date
          </label>
          <input className={inputClassName} id="roster-end" name="endDate" required type="date" />
        </div>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Creating..." : "Create roster"}
      </Button>
    </form>
  )
}
