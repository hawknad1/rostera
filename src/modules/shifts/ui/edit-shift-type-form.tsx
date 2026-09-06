"use client"

import { useActionState, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  calculateShiftDurationMinutes,
  formatShiftDuration,
} from "@/lib/dates/shift-time"
import type { ShiftActionState } from "@/modules/shifts/actions/create-shift-type"
import { updateShiftTypeAction } from "@/modules/shifts/actions/update-shift-type"
import { inputClassName, labelClassName } from "@/modules/shifts/ui/form-styles"

function liveDuration(startTime: string, endTime: string, isOvernight: boolean) {
  try {
    return formatShiftDuration(
      calculateShiftDurationMinutes({ startTime, endTime, isOvernight }),
    )
  } catch {
    return null
  }
}

export function EditShiftTypeForm({
  shiftType,
}: {
  shiftType: {
    id: string
    name: string
    description: string | null
    startTime: string
    endTime: string
    isOvernight: boolean
  }
}) {
  const [state, action, pending] = useActionState<ShiftActionState, FormData>(
    updateShiftTypeAction,
    null,
  )
  const [startTime, setStartTime] = useState(shiftType.startTime)
  const [endTime, setEndTime] = useState(shiftType.endTime)
  const [isOvernight, setIsOvernight] = useState(shiftType.isOvernight)
  const durationLabel = useMemo(
    () => liveDuration(startTime, endTime, isOvernight),
    [endTime, isOvernight, startTime],
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <input name="id" type="hidden" value={shiftType.id} />

      <div>
        <label className={labelClassName} htmlFor="edit-shift-name">
          Name
        </label>
        <input
          className={inputClassName}
          defaultValue={shiftType.name}
          id="edit-shift-name"
          name="name"
          required
          type="text"
        />
      </div>

      <div>
        <label className={labelClassName} htmlFor="edit-shift-description">
          Description
        </label>
        <input
          className={inputClassName}
          defaultValue={shiftType.description ?? ""}
          id="edit-shift-description"
          name="description"
          type="text"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="edit-shift-start">
            Start
          </label>
          <input
            className={inputClassName}
            id="edit-shift-start"
            name="startTime"
            onChange={(event) => setStartTime(event.target.value)}
            required
            type="time"
            value={startTime}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="edit-shift-end">
            End
          </label>
          <input
            className={inputClassName}
            id="edit-shift-end"
            name="endTime"
            onChange={(event) => setEndTime(event.target.value)}
            required
            type="time"
            value={endTime}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          checked={isOvernight}
          name="isOvernight"
          onChange={(event) => setIsOvernight(event.target.checked)}
          type="checkbox"
        />
        Ends the following day
      </label>

      <p className="text-sm text-muted-foreground">
        Duration: {durationLabel ?? "Enter a valid start and end time."}
      </p>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Saving..." : "Save shift"}
      </Button>
    </form>
  )
}
