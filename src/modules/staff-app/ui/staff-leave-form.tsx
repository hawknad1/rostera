"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  createStaffLeaveAction,
  type StaffLeaveActionState,
} from "@/modules/staff-app/actions/leave"
import { leaveTypeLabels } from "@/modules/leave/labels"
import { leaveTypes } from "@/modules/leave/schemas/leave"
import {
  inputClassName,
  labelClassName,
  selectClassName,
  textareaClassName,
} from "@/modules/leave/ui/form-styles"
import { OfflineMutationNotice, useOfflineSubmitGuard } from "@/modules/staff-app/ui/offline-mutation"

export function StaffLeaveForm() {
  const [state, action, pending] = useActionState<StaffLeaveActionState, FormData>(
    createStaffLeaveAction,
    null,
  )
  const { online, message } = useOfflineSubmitGuard()

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div>
        <label className={labelClassName} htmlFor="staff-leave-type">
          Leave type
        </label>
        <select className={selectClassName} id="staff-leave-type" name="leaveType" required>
          <option value="">Select a leave type</option>
          {leaveTypes.map((type) => (
            <option key={type} value={type}>
              {leaveTypeLabels[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="staff-leave-start">
            Start date
          </label>
          <input
            className={inputClassName}
            id="staff-leave-start"
            name="startDate"
            required
            type="date"
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="staff-leave-end">
            End date
          </label>
          <input
            className={inputClassName}
            id="staff-leave-end"
            name="endDate"
            required
            type="date"
          />
        </div>
      </div>

      <div>
        <label className={labelClassName} htmlFor="staff-leave-notes">
          Reason
        </label>
        <textarea className={textareaClassName} id="staff-leave-notes" name="notes" rows={4} />
      </div>

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <OfflineMutationNotice />

      <Button disabled={pending || !online} size="lg" type="submit">
        {pending ? "Submitting..." : "Submit request"}
      </Button>
      {!online && message ? <span className="sr-only">{message}</span> : null}
    </form>
  )
}
