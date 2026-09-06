import Link from "next/link"

import { formatDisplayDate } from "@/lib/dates/calendar-date"
import { leaveStatusLabels, leaveTypeLabels } from "@/modules/leave/labels"
import { listLeave } from "@/modules/leave/services/leave"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function StaffLeavePage() {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const leave = (await listLeave()).filter((row) => row.staffId === identity.staff.id)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
          <p className="text-sm text-muted-foreground">Your leave requests.</p>
        </div>
        {identity.canMutate ? (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/me/leave/new"
          >
            Request leave
          </Link>
        ) : null}
      </header>

      {leave.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leave requests yet.</p>
      ) : (
        <ul className="flex flex-col">
          {leave.map((row) => (
            <li className="border-b border-border py-3 last:border-b-0" key={row.id}>
              <Link
                className="flex min-h-12 flex-col gap-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                href={`/me/leave/${row.id}`}
              >
                <span className="text-sm font-medium">{leaveTypeLabels[row.leaveType]}</span>
                <span className="text-sm text-muted-foreground">
                  {formatDisplayDate(row.startDate)} – {formatDisplayDate(row.endDate)}
                </span>
                <span className="text-sm text-muted-foreground">{leaveStatusLabels[row.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
