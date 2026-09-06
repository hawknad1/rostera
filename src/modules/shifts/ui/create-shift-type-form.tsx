"use client"

import { useActionState, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  calculateShiftDurationMinutes,
  formatShiftDuration,
} from "@/lib/dates/shift-time"
import {
  createShiftTypeAction,
  type ShiftActionState,
} from "@/modules/shifts/actions/create-shift-type"
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

export function CreateShiftTypeForm() {
  const [state, action, pending] = useActionState<ShiftActionState, FormData>(
    createShiftTypeAction,
    null,
  )
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("16:00")
  const [isOvernight, setIsOvernight] = useState(false)
  const durationLabel = useMemo(
    () => liveDuration(startTime, endTime, isOvernight),
    [endTime, isOvernight, startTime],
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div>
        <label className={labelClassName} htmlFor="shift-name">
          Name
        </label>
        <input className={inputClassName} id="shift-name" name="name" required type="text" />
      </div>

      <div>
        <label className={labelClassName} htmlFor="shift-description">
          Description
        </label>
        <input className={inputClassName} id="shift-description" name="description" type="text" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="shift-start">
            Start
          </label>
          <input
            className={inputClassName}
            id="shift-start"
            name="startTime"
            onChange={(event) => setStartTime(event.target.value)}
            required
            type="time"
            value={startTime}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="shift-end">
            End
          </label>
          <input
            className={inputClassName}
            id="shift-end"
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
        {pending ? "Creating..." : "Create shift"}
      </Button>
    </form>
  )
}
