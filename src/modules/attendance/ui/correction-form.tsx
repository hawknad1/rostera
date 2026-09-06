"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  correctAttendanceAction,
  type AttendanceCorrectionState,
} from "@/modules/attendance/actions/correct"
import { datetimeLocalValue } from "@/modules/attendance/services/time"
import { labelClassName, textareaClassName } from "@/modules/leave/ui/form-styles"
import { inputClassName } from "@/modules/organizations/ui/form-styles"

export function AttendanceCorrectionForm({
  recordId,
  clockIn,
  clockOut,
  timeZone,
}: {
  recordId: string
  clockIn: string | null
  clockOut: string | null
  timeZone: string
}) {
  const [state, action, pending] = useActionState<AttendanceCorrectionState, FormData>(
    correctAttendanceAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <input name="id" type="hidden" value={recordId} />
      <p className="text-sm text-muted-foreground">
        This is a manual correction. The original event history is kept.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="attendance-clock-in">
            Clock in
          </label>
          <input
            className={inputClassName}
            defaultValue={datetimeLocalValue(clockIn, timeZone)}
            id="attendance-clock-in"
            name="clockIn"
            type="datetime-local"
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="attendance-clock-out">
            Clock out
          </label>
          <input
            className={inputClassName}
            defaultValue={datetimeLocalValue(clockOut, timeZone)}
            id="attendance-clock-out"
            name="clockOut"
            type="datetime-local"
          />
        </div>
      </div>
      <div>
        <label className={labelClassName} htmlFor="attendance-reason">
          Reason
        </label>
        <textarea
          className={textareaClassName}
          id="attendance-reason"
          name="reason"
          required
          rows={4}
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Saving..." : "Submit correction"}
      </Button>
    </form>
  )
}
