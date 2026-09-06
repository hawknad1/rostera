"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import type { StaffingRequirementActionState } from "@/modules/shifts/actions/create-staffing-requirement"
import { updateStaffingRequirementAction } from "@/modules/shifts/actions/update-staffing-requirement"
import { inputClassName, labelClassName, selectClassName } from "@/modules/shifts/ui/form-styles"

type ProfessionOption = {
  id: string
  name: string
  isActive: boolean
  source: "Global" | "Hospital"
}

type ShiftOption = {
  id: string
  name: string
  isActive: boolean
}

export function EditStaffingRequirementForm({
  requirement,
  departments,
  shiftTypes,
  professions,
}: {
  requirement: {
    id: string
    departmentId: string
    shiftTypeId: string
    professionId: string
    requiredCount: number
  }
  departments: { id: string; name: string }[]
  shiftTypes: ShiftOption[]
  professions: ProfessionOption[]
}) {
  const [state, action, pending] = useActionState<StaffingRequirementActionState, FormData>(
    updateStaffingRequirementAction,
    null,
  )

  const selectableShifts = shiftTypes.filter(
    (shiftType) => shiftType.isActive || shiftType.id === requirement.shiftTypeId,
  )
  const selectableProfessions = professions.filter(
    (profession) => profession.isActive || profession.id === requirement.professionId,
  )

  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="id" type="hidden" value={requirement.id} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClassName} htmlFor={`requirement-department-${requirement.id}`}>
            Department
          </label>
          <select
            className={selectClassName}
            defaultValue={requirement.departmentId}
            id={`requirement-department-${requirement.id}`}
            name="departmentId"
            required
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor={`requirement-shift-${requirement.id}`}>
            Shift
          </label>
          <select
            className={selectClassName}
            defaultValue={requirement.shiftTypeId}
            id={`requirement-shift-${requirement.id}`}
            name="shiftTypeId"
            required
          >
            {selectableShifts.map((shiftType) => (
              <option key={shiftType.id} value={shiftType.id}>
                {shiftType.name}
                {shiftType.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor={`requirement-profession-${requirement.id}`}>
            Profession
          </label>
          <select
            className={selectClassName}
            defaultValue={requirement.professionId}
            id={`requirement-profession-${requirement.id}`}
            name="professionId"
            required
          >
            {selectableProfessions.map((profession) => (
              <option key={profession.id} value={profession.id}>
                {profession.name} ({profession.source})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor={`requirement-count-${requirement.id}`}>
            Required count
          </label>
          <input
            className={inputClassName}
            defaultValue={requirement.requiredCount}
            id={`requirement-count-${requirement.id}`}
            max={100}
            min={1}
            name="requiredCount"
            required
            type="number"
          />
        </div>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button className="self-start" disabled={pending} type="submit">
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  )
}
