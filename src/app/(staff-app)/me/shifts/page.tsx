import { Temporal } from "temporal-polyfill"
import Link from "next/link"

import { listStaffShifts } from "@/modules/staff-app/services/shifts"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { StaffCacheSync } from "@/modules/staff-app/ui/staff-cache-sync"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function StaffShiftsPage() {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const result = await listStaffShifts()

  return (
    <div className="flex flex-col gap-6">
      <StaffCacheSync
        organizationId={result.identity.staff.organizationId}
        patch={{
          cachedAt: Temporal.Now.instant().toString(),
          shifts: result.assignments,
        }}
        userId={result.identity.user.id}
      />
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Shifts</h1>
        <p className="text-sm text-muted-foreground">Your published assignments.</p>
      </header>
      {result.assignments.length === 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium">No upcoming shifts</p>
          <p className="text-sm text-muted-foreground">
            You currently have no published shifts in the available roster.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {result.assignments.map((shift) => (
            <li className="border-b border-border py-3 last:border-b-0" key={shift.id}>
              <Link
                className="flex min-h-12 flex-col gap-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                href={`/me/shifts/${shift.id}`}
              >
                <span className="text-sm font-medium">
                  {shift.relativeDayLabel} · {shift.shiftTypeName}
                </span>
                <span className="text-sm text-muted-foreground">{shift.timeLabel}</span>
                <span className="text-sm text-muted-foreground">{shift.departmentName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
