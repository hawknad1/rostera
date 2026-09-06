"use client"

import { useActionState, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  createAssignmentAction,
  type AssignmentActionState,
} from "@/modules/rosters/actions/create-assignment"
import { inputClassName, labelClassName, selectClassName } from "@/modules/rosters/ui/form-styles"

type StaffOption = {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  staffNumber: string
  professionName: string
}

function staffLabel(staff: StaffOption) {
  const name = [staff.firstName, staff.middleName, staff.lastName].filter(Boolean).join(" ")
  return `${name} (${staff.staffNumber})`
}

export function AddAssignmentForm({
  rosterId,
  minDate,
  maxDate,
  shiftTypes,
  staff,
}: {
  rosterId: string
  minDate: string
  maxDate: string
  shiftTypes: { id: string; name: string; startTime: string; endTime: string }[]
  staff: StaffOption[]
}) {
  const [open, setOpen] = useState(false)
  const [staffId, setStaffId] = useState("")
  const [state, action, pending] = useActionState<AssignmentActionState, FormData>(
    createAssignmentAction,
    null,
  )

  const selectedStaff = useMemo(
    () => staff.find((member) => member.id === staffId) ?? null,
    [staff, staffId],
  )

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} type="button">
        Add assignment
      </Button>
    )
  }

  if (shiftTypes.length === 0 || staff.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Add active staff in this department and at least one active shift type before assigning
          shifts.
        </p>
        <Button onClick={() => setOpen(false)} type="button" variant="outline">
          Close
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <input name="rosterId" type="hidden" value={rosterId} />

      <div>
        <label className={labelClassName} htmlFor="assignment-date">
          Date
        </label>
        <input
          className={inputClassName}
          id="assignment-date"
          max={maxDate}
          min={minDate}
          name="date"
          required
          type="date"
        />
      </div>

      <div>
        <label className={labelClassName} htmlFor="assignment-shift">
          Shift type
        </label>
        <select className={selectClassName} id="assignment-shift" name="shiftTypeId" required>
          <option value="">Select a shift</option>
          {shiftTypes.map((shiftType) => (
            <option key={shiftType.id} value={shiftType.id}>
              {shiftType.name} ({shiftType.startTime}–{shiftType.endTime})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClassName} htmlFor="assignment-staff">
          Staff member
        </label>
        <select
          className={selectClassName}
          id="assignment-staff"
          name="staffId"
          onChange={(event) => setStaffId(event.target.value)}
          required
          value={staffId}
        >
          <option value="">Select staff</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {staffLabel(member)}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {selectedStaff
            ? `Profession comes from the staff record: ${selectedStaff.professionName}`
            : "Profession is taken from the selected staff record and cannot be chosen separately."}
        </p>
      </div>

      {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state && state.ok === true && state.warnings.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {state.warnings.map((warning, index) => (
            <li
              className={
                warning.severity === "INFO"
                  ? "text-sm text-muted-foreground"
                  : "text-sm text-foreground"
              }
              key={`${warning.code}-${index}`}
            >
              {warning.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={pending} type="submit">
          {pending ? "Adding..." : "Add assignment"}
        </Button>
      </div>
    </form>
  )
}
