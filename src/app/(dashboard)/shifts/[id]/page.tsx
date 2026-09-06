import Link from "next/link"
import { notFound } from "next/navigation"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { ShiftError } from "@/modules/shifts/errors"
import { getShiftType } from "@/modules/shifts/services/shift-types"
import { DeactivateShiftTypeForm } from "@/modules/shifts/ui/deactivate-shift-type-form"
import { EditShiftTypeForm } from "@/modules/shifts/ui/edit-shift-type-form"

export default async function ShiftDetailPage({
  params,
}: PageProps<"/shifts/[id]">) {
  const { id } = await params
  const membership = await requirePermission(permissions.shiftView)

  let shiftType
  try {
    shiftType = await getShiftType(id)
  } catch (error) {
    if (error instanceof ShiftError && error.code === "NOT_FOUND") {
      notFound()
    }
    throw error
  }

  const [canEdit, canDeactivate] = await Promise.all([
    hasPermission(membership, permissions.shiftEdit),
    hasPermission(membership, permissions.shiftDeactivate),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/shifts">
          Back to shifts
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{shiftType.name}</h1>
        {shiftType.description ? (
          <p className="text-sm text-muted-foreground">{shiftType.description}</p>
        ) : null}
      </div>

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Start</dt>
          <dd>{shiftType.startTime}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">End</dt>
          <dd>
            {shiftType.endTime}
            {shiftType.isOvernight ? " (following day)" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Duration</dt>
          <dd>{shiftType.durationLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{shiftType.isActive ? "Active" : "Inactive"}</dd>
        </div>
      </dl>

      {canEdit ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Edit shift</h2>
          <EditShiftTypeForm shiftType={shiftType} />
        </section>
      ) : null}

      {canDeactivate ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Deactivate</h2>
          <DeactivateShiftTypeForm isActive={shiftType.isActive} shiftTypeId={shiftType.id} />
        </section>
      ) : null}
    </main>
  )
}
