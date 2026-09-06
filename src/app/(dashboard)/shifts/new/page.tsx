import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { CreateShiftTypeForm } from "@/modules/shifts/ui/create-shift-type-form"

export default async function NewShiftPage() {
  await requirePermission(permissions.shiftCreate)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/shifts">
          Back to shifts
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add shift</h1>
        <p className="text-sm text-muted-foreground">
          Configure a recurring local-time shift. Duration is derived from start, end, and whether
          it ends the following day.
        </p>
      </div>

      <CreateShiftTypeForm />
    </main>
  )
}
