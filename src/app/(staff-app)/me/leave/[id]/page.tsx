import Link from "next/link"
import { notFound } from "next/navigation"

import { formatDateRange, formatDisplayDate } from "@/lib/dates/calendar-date"
import { LeaveError } from "@/modules/leave/errors"
import { formatLeaveDuration, leaveStatusLabels, leaveTypeLabels } from "@/modules/leave/labels"
import { getLeave } from "@/modules/leave/services/leave"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { StaffCancelLeaveButton } from "@/modules/staff-app/ui/staff-cancel-leave"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function StaffLeaveDetailPage({ params }: PageProps<"/me/leave/[id]">) {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const { id } = await params
  let leave

  try {
    leave = await getLeave(id)
  } catch (error) {
    if (error instanceof LeaveError && error.code === "LEAVE_NOT_FOUND") {
      notFound()
    }

    throw error
  }

  if (leave.staffId !== identity.staff.id) {
    notFound()
  }

  const canCancel = identity.canMutate && leave.status === "PENDING"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/me/leave"
        >
          Back to leave
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{leaveTypeLabels[leave.leaveType]}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDateRange(leave.startDate, leave.endDate)} · {formatLeaveDuration(leave.durationDays)}
        </p>
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{leaveStatusLabels[leave.status]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dates</dt>
          <dd>
            {formatDisplayDate(leave.startDate)} – {formatDisplayDate(leave.endDate)}
          </dd>
        </div>
        {leave.notes ? (
          <div>
            <dt className="text-muted-foreground">Reason</dt>
            <dd>{leave.notes}</dd>
          </div>
        ) : null}
      </dl>

      {canCancel ? <StaffCancelLeaveButton leaveId={leave.id} /> : null}
    </div>
  )
}
