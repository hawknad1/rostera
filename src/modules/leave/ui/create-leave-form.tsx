"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  createLeaveAction,
  type LeaveActionState,
} from "@/modules/leave/actions/create-leave"
import { leaveTypeLabels } from "@/modules/leave/labels"
import { leaveTypes } from "@/modules/leave/schemas/leave"
import {
  inputClassName,
  labelClassName,
  selectClassName,
  textareaClassName,
} from "@/modules/leave/ui/form-styles"

export function CreateLeaveForm({
  staff,
  canSelectStaff,
  defaultStaffId,
}: {
  staff: { id: string; name: string; staffNumber: string }[]
  canSelectStaff: boolean
  defaultStaffId?: string | null
}) {
  const [state, action, pending] = useActionState<LeaveActionState, FormData>(
    createLeaveAction,
    null,
  )

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {canSelectStaff ? (
        <div>
          <label className={labelClassName} htmlFor="leave-staff">
            Staff member
          </label>
          <select
            className={selectClassName}
            defaultValue={defaultStaffId ?? ""}
            id="leave-staff"
            name="staffId"
            required
          >
            <option value="">Select a staff member</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.staffNumber})
              </option>
            ))}
          </select>
        </div>
      ) : defaultStaffId ? (
        <input name="staffId" type="hidden" value={defaultStaffId} />
      ) : null}

      <div>
        <label className={labelClassName} htmlFor="leave-type">
          Leave type
        </label>
        <select className={selectClassName} id="leave-type" name="leaveType" required>
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
          <label className={labelClassName} htmlFor="leave-start">
            Start date
          </label>
          <input className={inputClassName} id="leave-start" name="startDate" required type="date" />
        </div>
        <div>
          <label className={labelClassName} htmlFor="leave-end">
            End date
          </label>
          <input className={inputClassName} id="leave-end" name="endDate" required type="date" />
        </div>
      </div>

      <div>
        <label className={labelClassName} htmlFor="leave-notes">
          Reason / notes
        </label>
        <textarea className={textareaClassName} id="leave-notes" name="notes" />
        <p className="mt-1.5 text-xs text-muted-foreground">Optional.</p>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Submitting..." : "Request leave"}
      </Button>
    </form>
  )
}
