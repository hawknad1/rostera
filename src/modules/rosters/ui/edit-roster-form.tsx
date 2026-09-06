"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import type { RosterActionState } from "@/modules/rosters/actions/create-roster"
import { updateRosterAction } from "@/modules/rosters/actions/update-roster"
import { inputClassName, labelClassName } from "@/modules/rosters/ui/form-styles"

export function EditRosterForm({
  roster,
}: {
  roster: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
}) {
  const [state, action, pending] = useActionState<RosterActionState, FormData>(
    updateRosterAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <input name="id" type="hidden" value={roster.id} />

      <div>
        <label className={labelClassName} htmlFor="edit-roster-name">
          Roster name
        </label>
        <input
          className={inputClassName}
          defaultValue={roster.name}
          id="edit-roster-name"
          name="name"
          required
          type="text"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="edit-roster-start">
            Start date
          </label>
          <input
            className={inputClassName}
            defaultValue={roster.startDate}
            id="edit-roster-start"
            name="startDate"
            required
            type="date"
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="edit-roster-end">
            End date
          </label>
          <input
            className={inputClassName}
            defaultValue={roster.endDate}
            id="edit-roster-end"
            name="endDate"
            required
            type="date"
          />
        </div>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Saving..." : "Save roster"}
      </Button>
    </form>
  )
}
