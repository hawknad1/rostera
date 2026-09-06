import Link from "next/link"

import { StaffCacheSync } from "@/modules/staff-app/ui/staff-cache-sync"
import type { StaffIdentityLinked, StaffRosterView, StaffShiftView } from "@/modules/staff-app/types"

export function StaffRosterList({
  identity,
  rosters,
  assignments,
  cachedAt,
}: {
  identity: StaffIdentityLinked
  rosters: StaffRosterView[]
  assignments: StaffShiftView[]
  cachedAt: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <StaffCacheSync
        organizationId={identity.staff.organizationId}
        patch={{ cachedAt, roster: { rosters, assignments }, shifts: assignments }}
        userId={identity.user.id}
      />

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Roster</h1>
        {rosters.length === 1 ? (
          <p className="text-sm text-muted-foreground">
            {rosters[0].name} · version {rosters[0].versionNumber} · {rosters[0].dateRangeLabel}
          </p>
        ) : rosters.length > 1 ? (
          <p className="text-sm text-muted-foreground">
            {rosters.length} published rosters in your workplace.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">There is no published roster yet.</p>
        )}
      </header>

      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You currently have no published shifts in the available roster.
        </p>
      ) : (
        <ul className="flex flex-col">
          {assignments.map((shift) => (
            <li className="border-b border-border py-3 last:border-b-0" key={shift.id}>
              <Link
                className="flex min-h-12 flex-col gap-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                href={`/me/shifts/${shift.id}`}
              >
                <span className="text-sm font-medium">
                  {shift.weekdayLabel} {shift.dateLabel}
                </span>
                <span className="text-sm">{shift.shiftTypeName}</span>
                <span className="text-sm text-muted-foreground">
                  {shift.timeLabel}
                  {shift.isOvernight ? "" : ""}
                </span>
                <span className="text-sm text-muted-foreground">{shift.departmentName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
