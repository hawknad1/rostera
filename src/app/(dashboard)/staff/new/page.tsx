import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { CreateStaffForm } from "@/modules/staff/ui/create-staff-form"
import { listStaffFormOptions } from "@/modules/staff/services/staff"

export default async function NewStaffPage() {
  await requirePermission(permissions.staffCreate)
  const options = await listStaffFormOptions()

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

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/staff">
          Back to staff
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add staff member</h1>
        <p className="text-sm text-muted-foreground">
          Create an employee record without creating a Rostera login.
        </p>
      </div>

      {options.departments.length === 0 || professions.filter((profession) => profession.isActive).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create at least one department and one profession before adding staff.
        </p>
      ) : (
        <CreateStaffForm
          departments={options.departments.map((department) => ({
            id: department.id,
            name: department.name,
          }))}
          professions={professions}
        />
      )}
    </main>
  )
}
