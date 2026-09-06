import Link from "next/link"

import { StaffCacheSync } from "@/modules/staff-app/ui/staff-cache-sync"
import type { StaffIdentityLinked, StaffShiftDetail } from "@/modules/staff-app/types"

export function StaffShiftDetailView({
  identity,
  shift,
  cachedAt,
}: {
  identity: StaffIdentityLinked
  shift: StaffShiftDetail
  cachedAt: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <StaffCacheSync
        organizationId={identity.staff.organizationId}
        patch={{
          cachedAt,
          shiftDetails: { [shift.id]: shift },
          shifts: [shift],
        }}
        userId={identity.user.id}
      />

      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/me/shifts"
        >
          Back to shifts
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{shift.shiftTypeName}</h1>
        <p className="text-sm text-muted-foreground">
          {shift.relativeDayLabel} · {shift.dateLabel}
        </p>
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Time</dt>
          <dd>
            {shift.timeLabel}
            {shift.isCurrent ? " · in progress" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Department</dt>
          <dd>{shift.departmentName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Roster</dt>
          <dd>
            {shift.rosterName} · version {shift.rosterVersion}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{shift.rosterStatus === "PUBLISHED" ? "Published" : shift.rosterStatus}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Overnight</dt>
          <dd>{shift.isOvernight ? "Yes, continues into the following day" : "No"}</dd>
        </div>
      </dl>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Swap</h2>
        <p className="text-sm text-muted-foreground">{shift.swapEligibilityNote}</p>
        {shift.swapEligible ? (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
            href={`/me/swaps/new?sourceAssignmentId=${shift.id}`}
          >
            Request swap
          </Link>
        ) : null}
      </section>
    </div>
  )
}
