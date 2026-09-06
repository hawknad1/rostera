import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { LeaveList } from "@/modules/leave/ui/leave-list"
import { getLeaveCapabilities, listLeave } from "@/modules/leave/services/leave"

export default async function LeavePage() {
  await requirePermission(permissions.leaveView)
  const [leave, capabilities] = await Promise.all([listLeave(), getLeaveCapabilities()])

  const staff = [...new Map(leave.map((row) => [row.staffId, { id: row.staffId, name: row.staffName }])).values()]

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
          <p className="text-sm text-muted-foreground">
            {capabilities.isStaffSelfService
              ? "Your leave requests. Pending leave can be cancelled until it is reviewed."
              : "Organization leave requests. Approved leave blocks future scheduling."}
          </p>
        </div>
        {capabilities.canCreate ? (
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/leave/new"
          >
            Request leave
          </Link>
        ) : null}
      </div>

      {capabilities.isStaffSelfService && !capabilities.ownStaffId ? (
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a staff record, so you cannot request or view leave yet.
        </p>
      ) : leave.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leave requests have been recorded yet.</p>
      ) : (
        <LeaveList hideStaffFilter={capabilities.isStaffSelfService} leave={leave} staff={staff} />
      )}
    </main>
  )
}
