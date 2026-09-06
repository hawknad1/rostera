import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { CreateLeaveForm } from "@/modules/leave/ui/create-leave-form"
import {
  getLeaveCapabilities,
  listLeaveStaffOptions,
} from "@/modules/leave/services/leave"

export default async function NewLeavePage() {
  await requirePermission(permissions.leaveCreate)
  const [capabilities, staff] = await Promise.all([
    getLeaveCapabilities(),
    listLeaveStaffOptions(),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/leave">
          Back to leave
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Request leave</h1>
        <p className="text-sm text-muted-foreground">
          Leave dates are calendar days, inclusive. Only approved leave blocks scheduling.
        </p>
      </div>

      {capabilities.isStaffSelfService && !capabilities.ownStaffId ? (
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a staff record. Ask an administrator to link it before
          requesting leave.
        </p>
      ) : capabilities.canCreateForOthers && staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add an active staff member before creating leave on their behalf.
        </p>
      ) : (
        <CreateLeaveForm
          canSelectStaff={capabilities.canCreateForOthers}
          defaultStaffId={capabilities.ownStaffId}
          staff={staff}
        />
      )}
    </main>
  )
}
