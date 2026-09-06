import Link from "next/link"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { StaffList } from "@/modules/staff/ui/staff-list"
import { listStaff, listStaffFormOptions } from "@/modules/staff/services/staff"

export default async function StaffPage() {
  const membership = await requirePermission(permissions.staffView)
  const [staff, options, canCreate, canEdit] = await Promise.all([
    listStaff(),
    listStaffFormOptions(),
    hasPermission(membership, permissions.staffCreate),
    hasPermission(membership, permissions.staffEdit),
  ])

  const professions = [
    ...options.professions.global.map((profession) => ({
      id: profession.id,
      name: profession.name,
    })),
    ...options.professions.organization.map((profession) => ({
      id: profession.id,
      name: profession.name,
    })),
  ]

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Employee records for this hospital. A Rostera login is optional.
          </p>
        </div>
        {canCreate ? (
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/staff/new"
          >
            Add staff member
          </Link>
        ) : null}
      </div>

      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No staff members have been added yet.</p>
      ) : (
        <StaffList
          canEdit={canEdit}
          departments={options.departments.map((department) => ({
            id: department.id,
            name: department.name,
          }))}
          professions={professions}
          staff={staff}
        />
      )}
    </main>
  )
}
