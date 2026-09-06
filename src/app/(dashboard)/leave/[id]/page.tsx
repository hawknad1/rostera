import Link from "next/link"
import { notFound } from "next/navigation"

import { requirePermission } from "@/lib/auth/require-permission"
import { formatDateRange, formatDisplayDate } from "@/lib/dates/calendar-date"
import { permissions } from "@/lib/permissions/permissions"
import { LeaveError } from "@/modules/leave/errors"
import {
  formatLeaveDuration,
  leaveStatusLabels,
  leaveTypeLabels,
} from "@/modules/leave/labels"
import { LeaveReviewActions } from "@/modules/leave/ui/leave-review-actions"
import { getLeave, getLeaveCapabilities } from "@/modules/leave/services/leave"

function formatReviewedAt(value: unknown) {
  if (!value) {
    return null
  }

  const raw = String(value)
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? raw.slice(0, 10)
}

export default async function LeaveDetailPage({
  params,
}: PageProps<"/leave/[id]">) {
  const { id } = await params
  await requirePermission(permissions.leaveView)

  let leave
  try {
    leave = await getLeave(id)
  } catch (error) {
    if (error instanceof LeaveError && error.code === "LEAVE_NOT_FOUND") {
      notFound()
    }
    throw error
  }

  const capabilities = await getLeaveCapabilities()
  const isOwn = capabilities.ownStaffId === leave.staffId
  const canCancelPending = leave.status === "PENDING" && (isOwn || capabilities.canApprove)
  const canCancelApproved = leave.status === "APPROVED" && capabilities.canApprove

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/leave">
          Back to leave
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{leave.staffName}</h1>
        <p className="text-sm text-muted-foreground">
          {leaveTypeLabels[leave.leaveType]} · {formatDateRange(leave.startDate, leave.endDate)} ·{" "}
          {formatLeaveDuration(leave.durationDays)} · {leaveStatusLabels[leave.status]}
        </p>
      </div>

      <section className="grid gap-6 sm:grid-cols-2">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Staff</dt>
            <dd>{leave.staffName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Leave type</dt>
            <dd>{leaveTypeLabels[leave.leaveType]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dates</dt>
            <dd>
              {formatDisplayDate(leave.startDate)} – {formatDisplayDate(leave.endDate)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Duration</dt>
            <dd>{formatLeaveDuration(leave.durationDays)}</dd>
          </div>
        </dl>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{leaveStatusLabels[leave.status]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Requested by</dt>
            <dd>{leave.requestedByLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reviewed by</dt>
            <dd>{leave.reviewedByLabel ?? "Not reviewed"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reviewed on</dt>
            <dd>{formatReviewedAt(leave.reviewedAt) ?? "Not reviewed"}</dd>
          </div>
        </dl>
      </section>

      {leave.notes ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Notes</h2>
          <p className="text-sm">{leave.notes}</p>
        </section>
      ) : null}

      <LeaveReviewActions
        canApprove={leave.status === "PENDING" && capabilities.canApprove}
        canCancel={canCancelPending || canCancelApproved}
        canReject={leave.status === "PENDING" && capabilities.canReject}
        leaveId={leave.id}
        status={leave.status}
      />
    </main>
  )
}
