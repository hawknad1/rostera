"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  createStaffingRequirementAction,
  type StaffingRequirementActionState,
} from "@/modules/shifts/actions/create-staffing-requirement"
import { inputClassName, labelClassName, selectClassName } from "@/modules/shifts/ui/form-styles"

type ProfessionOption = {
  id: string
  name: string
  source: "Global" | "Hospital"
}

export function CreateStaffingRequirementForm({
  departments,
  shiftTypes,
  professions,
}: {
  departments: { id: string; name: string }[]
  shiftTypes: { id: string; name: string }[]
  professions: ProfessionOption[]
}) {
  const [state, action, pending] = useActionState<StaffingRequirementActionState, FormData>(
    createStaffingRequirementAction,
    null,
  )

  if (departments.length === 0 || shiftTypes.length === 0 || professions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create at least one department, one active shift, and one profession before adding staffing
        requirements.
      </p>
    )
  }

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="requirement-department">
            Department
          </label>
          <select className={selectClassName} id="requirement-department" name="departmentId" required>
            <option value="">Select a department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor="requirement-shift">
            Shift
          </label>
          <select className={selectClassName} id="requirement-shift" name="shiftTypeId" required>
            <option value="">Select a shift</option>
            {shiftTypes.map((shiftType) => (
              <option key={shiftType.id} value={shiftType.id}>
                {shiftType.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor="requirement-profession">
            Profession
          </label>
          <select className={selectClassName} id="requirement-profession" name="professionId" required>
            <option value="">Select a profession</option>
            {professions.map((profession) => (
              <option key={profession.id} value={profession.id}>
                {profession.name} ({profession.source})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor="requirement-count">
            Required count
          </label>
          <input
            className={inputClassName}
            id="requirement-count"
            min={1}
            max={100}
            name="requiredCount"
            required
            type="number"
          />
        </div>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Creating..." : "Create requirement"}
      </Button>
    </form>
  )
}
