import { DeleteStaffingRequirementForm } from "@/modules/shifts/ui/delete-staffing-requirement-form"
import { EditStaffingRequirementForm } from "@/modules/shifts/ui/edit-staffing-requirement-form"

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

export type StaffingRequirementListItem = {
  id: string
  departmentId: string
  shiftTypeId: string
  professionId: string
  requiredCount: number
  departmentName: string
  shiftTypeName: string
  shiftTypeIsActive: boolean
  professionName: string
}

export function StaffingRequirementList({
  requirements,
  departments,
  shiftTypes,
  professions,
  canEdit,
  canDelete,
}: {
  requirements: StaffingRequirementListItem[]
  departments: { id: string; name: string }[]
  shiftTypes: ShiftOption[]
  professions: ProfessionOption[]
  canEdit: boolean
  canDelete: boolean
}) {
  if (requirements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No staffing requirements have been configured yet.</p>
    )
  }

  return (
    <ul className="flex flex-col gap-6">
      {requirements.map((requirement) => (
        <li className="border-t border-border pt-4" key={requirement.id}>
          <div className="mb-3 flex flex-wrap items-baseline gap-2">
            <p className="font-medium">
              {requirement.departmentName} · {requirement.shiftTypeName} · {requirement.professionName}
            </p>
            <span className="text-sm text-muted-foreground">Required: {requirement.requiredCount}</span>
            {requirement.shiftTypeIsActive ? null : (
              <span className="text-xs text-muted-foreground">Shift inactive</span>
            )}
          </div>
          {canEdit ? (
            <div className="flex flex-col gap-3">
              <EditStaffingRequirementForm
                departments={departments}
                professions={professions}
                requirement={requirement}
                shiftTypes={shiftTypes}
              />
              {canDelete ? <DeleteStaffingRequirementForm requirementId={requirement.id} /> : null}
            </div>
          ) : canDelete ? (
            <DeleteStaffingRequirementForm requirementId={requirement.id} />
          ) : null}
        </li>
      ))}
    </ul>
  )
}
