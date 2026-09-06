import Link from "next/link"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import {
  listShiftFormOptions,
  listStaffingRequirements,
} from "@/modules/shifts/services/staffing-requirements"
import { CreateStaffingRequirementForm } from "@/modules/shifts/ui/create-staffing-requirement-form"
import { StaffingRequirementList } from "@/modules/shifts/ui/staffing-requirement-list"

export default async function StaffingRequirementsPage() {
  const membership = await requirePermission(permissions.shiftView)
  const [requirements, options, canCreate, canEdit, canDelete] = await Promise.all([
    listStaffingRequirements(),
    listShiftFormOptions(),
    hasPermission(membership, permissions.shiftCreate),
    hasPermission(membership, permissions.shiftEdit),
    hasPermission(membership, permissions.shiftDeactivate),
  ])

  const professions = [
    ...options.professions.global.map((profession) => ({
      id: profession.id,
      name: profession.name,
      isActive: profession.isActive,
      source: "Global" as const,
    })),
    ...options.professions.organization.map((profession) => ({
      id: profession.id,
      name: profession.name,
      isActive: profession.isActive,
      source: "Hospital" as const,
    })),
  ]

  const activeShiftTypes = options.shiftTypes.filter((shiftType) => shiftType.isActive)
  const activeProfessions = professions.filter((profession) => profession.isActive)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/shifts">
          Back to shifts
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Staffing requirements</h1>
        <p className="text-sm text-muted-foreground">
          How many qualified people each department needs for each shift. This does not assign
          people.
        </p>
      </div>

      <StaffingRequirementList
        canDelete={canDelete}
        canEdit={canEdit}
        departments={options.departments.map((department) => ({
          id: department.id,
          name: department.name,
        }))}
        professions={professions}
        requirements={requirements}
        shiftTypes={options.shiftTypes.map((shiftType) => ({
          id: shiftType.id,
          name: shiftType.name,
          isActive: shiftType.isActive,
        }))}
      />

      {canCreate ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Create requirement</h2>
          <CreateStaffingRequirementForm
            departments={options.departments.map((department) => ({
              id: department.id,
              name: department.name,
            }))}
            professions={activeProfessions}
            shiftTypes={activeShiftTypes.map((shiftType) => ({
              id: shiftType.id,
              name: shiftType.name,
            }))}
          />
        </section>
      ) : null}
    </main>
  )
}
