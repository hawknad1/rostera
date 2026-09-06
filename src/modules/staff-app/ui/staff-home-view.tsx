import Link from "next/link"

import { StaffCacheSync } from "@/modules/staff-app/ui/staff-cache-sync"
import { TerminatedStaffNotice } from "@/modules/staff-app/ui/staff-status"
import type { StaffHomeView } from "@/modules/staff-app/types"

function ShiftBlock({
  title,
  shift,
}: {
  title: string
  shift: NonNullable<StaffHomeView["nextShift"]>
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <p className="text-lg font-semibold tracking-tight">{shift.relativeDayLabel}</p>
      <p className="text-base">{shift.shiftTypeName}</p>
      <p className="text-sm text-muted-foreground">{shift.timeLabel}</p>
      <p className="text-sm text-muted-foreground">{shift.departmentName}</p>
      <Link
        className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        href={`/me/shifts/${shift.id}`}
      >
        View shift
      </Link>
    </section>
  )
}

export function StaffHomeView({ home, cachedAt }: { home: StaffHomeView; cachedAt: string }) {
  const { identity } = home

  return (
    <div className="flex flex-col gap-8">
      <StaffCacheSync
        organizationId={identity.staff.organizationId}
        patch={{
          cachedAt,
          home: {
            greeting: home.greeting,
            firstName: home.firstName,
            organizationName: home.organizationName,
            currentRoster: home.currentRoster,
            currentShift: home.currentShift,
            nextShift: home.nextShift,
            upcoming: home.upcoming,
            pendingLeaveCount: home.pendingLeaveCount,
            pendingSwapCount: home.pendingSwapCount,
            unreadNotificationCount: home.unreadNotificationCount,
          },
        }}
        userId={identity.user.id}
      />

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {home.greeting}, {home.firstName}
        </h1>
        <p className="text-sm text-muted-foreground">{home.organizationName}</p>
      </header>

      {identity.staff.employmentStatus === "TERMINATED" ? <TerminatedStaffNotice /> : null}

      {home.currentShift ? (
        <ShiftBlock shift={home.currentShift} title="Working now" />
      ) : home.nextShift ? (
        <ShiftBlock shift={home.nextShift} title="Your next shift" />
      ) : (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-muted-foreground">Your next shift</h2>
          <p className="text-base font-medium">No upcoming shifts</p>
          <p className="text-sm text-muted-foreground">
            You currently have no published shifts in the available roster.
          </p>
        </section>
      )}

      {home.currentRoster ? (
        <p className="text-sm text-muted-foreground">
          {home.currentRoster.name} · version {home.currentRoster.versionNumber}
        </p>
      ) : null}

      {home.upcoming.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
          <ul className="flex flex-col">
            {home.upcoming.map((shift) => (
              <li className="border-b border-border py-3 last:border-b-0" key={shift.id}>
                <Link className="flex min-h-11 flex-col gap-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/me/shifts/${shift.id}`}>
                  <span className="text-sm font-medium">
                    {shift.weekdayLabel} · {shift.shiftTypeName}
                  </span>
                  <span className="text-sm text-muted-foreground">{shift.timeLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/me/roster"
          >
            View full roster
          </Link>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Requests</h2>
        <Link className="flex min-h-11 items-center justify-between text-sm" href="/me/leave">
          <span>Leave</span>
          <span className="text-muted-foreground">
            {home.pendingLeaveCount === 0 ? "None pending" : `${home.pendingLeaveCount} pending`}
          </span>
        </Link>
        <Link className="flex min-h-11 items-center justify-between text-sm" href="/me/swaps">
          <span>Swap</span>
          <span className="text-muted-foreground">
            {home.pendingSwapCount === 0
              ? "None pending"
              : home.pendingSwapCount === 1
                ? "1 pending"
                : `${home.pendingSwapCount} pending`}
          </span>
        </Link>
        <Link className="flex min-h-11 items-center justify-between text-sm" href="/me/notifications">
          <span>Notifications</span>
          <span className="text-muted-foreground">
            {home.unreadNotificationCount === 0
              ? "None unread"
              : home.unreadNotificationCount === 1
                ? "1 unread"
                : `${home.unreadNotificationCount} unread`}
          </span>
        </Link>
      </section>
    </div>
  )
}
