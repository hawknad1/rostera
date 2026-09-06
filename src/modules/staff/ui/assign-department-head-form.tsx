"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { assignDepartmentHeadAction } from "@/modules/staff/actions/assign-department-head"
import { clearDepartmentHeadAction } from "@/modules/staff/actions/clear-department-head"
import type { StaffActionState } from "@/modules/staff/actions/create-staff"
import { formatStaffName } from "@/modules/staff/labels"
import { labelClassName, selectClassName } from "@/modules/staff/ui/form-styles"

type HeadCandidate = {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  staffNumber: string
}

export function AssignDepartmentHeadForm({
  departmentId,
  currentHeadId,
  candidates,
}: {
  departmentId: string
  currentHeadId: string | null
  candidates: HeadCandidate[]
}) {
  const [assignState, assignAction, assignPending] = useActionState<StaffActionState, FormData>(
    assignDepartmentHeadAction,
    null,
  )
  const [clearState, clearAction, clearPending] = useActionState<StaffActionState, FormData>(
    clearDepartmentHeadAction,
    null,
  )

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <form action={assignAction} className="flex flex-col gap-3">
        <input name="departmentId" type="hidden" value={departmentId} />
        <div>
          <label className={labelClassName} htmlFor="department-head-staff">
            Department head
          </label>
          <select
            className={selectClassName}
            defaultValue={currentHeadId ?? ""}
            id="department-head-staff"
            name="staffId"
            required
          >
            <option value="">Select an active staff member</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {formatStaffName(candidate)} ({candidate.staffNumber})
              </option>
            ))}
          </select>
        </div>
        {assignState?.error ? <p className="text-sm text-destructive">{assignState.error}</p> : null}
        <Button className="self-start" disabled={assignPending || candidates.length === 0} type="submit">
          {assignPending ? "Assigning..." : "Assign department head"}
        </Button>
      </form>

      {currentHeadId ? (
        <form action={clearAction}>
          <input name="departmentId" type="hidden" value={departmentId} />
          {clearState?.error ? (
            <p className="mb-2 text-sm text-destructive">{clearState.error}</p>
          ) : null}
          <Button disabled={clearPending} type="submit" variant="outline">
            {clearPending ? "Clearing..." : "Clear department head"}
          </Button>
        </form>
      ) : null}

      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add an active staff member to this department before assigning a head.
        </p>
      ) : null}
    </div>
  )
}
