import Link from "next/link"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { listShiftTypes } from "@/modules/shifts/services/shift-types"
import { ShiftTypeList } from "@/modules/shifts/ui/shift-type-list"

export default async function ShiftsPage() {
  const membership = await requirePermission(permissions.shiftView)
  const [shiftTypes, canCreate, canEdit] = await Promise.all([
    listShiftTypes(),
    hasPermission(membership, permissions.shiftCreate),
    hasPermission(membership, permissions.shiftEdit),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Shifts</h1>
          <p className="text-sm text-muted-foreground">
            Recurring shift types for this hospital. Duration is calculated from start, end, and
            overnight.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="/shifts/requirements"
          >
            Staffing requirements
          </Link>
          {canCreate ? (
            <Link
              className="font-medium text-primary underline-offset-4 hover:underline"
              href="/shifts/new"
            >
              Add shift
            </Link>
          ) : null}
        </div>
      </div>

      {shiftTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shifts have been configured yet.</p>
      ) : (
        <ShiftTypeList canEdit={canEdit} shiftTypes={shiftTypes} />
      )}
    </main>
  )
}
