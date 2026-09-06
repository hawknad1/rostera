import { Temporal } from "temporal-polyfill"

import { greetingInTimeZone, todayInTimeZone } from "@/modules/staff-app/format"
import { requireLinkedStaff } from "@/modules/staff-app/services/identity"
import { loadPublishedStaffContext } from "@/modules/staff-app/services/roster"
import { currentShift, nextShift, upcomingShifts } from "@/modules/staff-app/services/shifts"
import type { StaffHomeView, StaffRosterView } from "@/modules/staff-app/types"
import { db } from "@/prisma/db"

export async function getStaffHome(now?: Temporal.Instant): Promise<StaffHomeView> {
  const identity = await requireLinkedStaff()
  const organizationId = identity.staff.organizationId
  const staffId = identity.staff.id
  const currentInstant = now ?? Temporal.Now.instant()

  const [context, leaveRows, requestedSwaps, targetedSwaps, unreadNotifications] = await Promise.all([
    loadPublishedStaffContext(identity),
    db.orm.public.LeaveRequest.where({
      organizationId,
      staffId,
      status: "PENDING",
    }).all(),
    db.orm.public.ShiftSwapRequest.where({
      organizationId,
      requesterStaffId: staffId,
      status: "PENDING",
    }).all(),
    db.orm.public.ShiftSwapRequest.where({
      organizationId,
      targetStaffId: staffId,
      status: "PENDING",
    }).all(),
    db.orm.public.Notification.where({
      organizationId,
      recipientUserId: identity.user.id,
      readAt: null,
    }).all(),
  ])

  const pendingLeaveCount = leaveRows.filter(
    (row) => row.organizationId === organizationId && row.staffId === staffId && row.status === "PENDING",
  ).length
  const pendingSwapIds = new Set(
    [...requestedSwaps, ...targetedSwaps]
      .filter((row) => row.organizationId === organizationId && row.status === "PENDING")
      .map((row) => row.id),
  )
  const unreadNotificationCount = unreadNotifications.filter(
    (row) =>
      row.organizationId === organizationId &&
      row.recipientUserId === identity.user.id &&
      row.readAt == null,
  ).length

  const today = todayInTimeZone(identity.timeZone, currentInstant)
  const inProgress = currentShift(context.assignments, currentInstant)
  const hero = nextShift(context.assignments, currentInstant)
  const upcoming = upcomingShifts(context.assignments, identity.timeZone, currentInstant, 4).filter(
    (assignment) => assignment.id !== hero?.id,
  )

  return {
    identity,
    greeting: greetingInTimeZone(identity.timeZone, currentInstant),
    firstName: identity.staff.firstName,
    organizationName: identity.organizationName,
    currentRoster: pickCurrentRoster(context.rosters, identity.staff.departmentId, today, hero),
    currentShift: inProgress,
    nextShift: hero,
    upcoming,
    pendingLeaveCount,
    pendingSwapCount: pendingSwapIds.size,
    unreadNotificationCount,
  }
}

function pickCurrentRoster(
  rosters: StaffRosterView[],
  departmentId: string,
  today: string,
  next: { rosterId: string } | null,
) {
  if (next) {
    return rosters.find((roster) => roster.id === next.rosterId) ?? null
  }

  const covering = rosters.filter(
    (roster) => roster.departmentId === departmentId && roster.startDate <= today && roster.endDate >= today,
  )

  return covering[0] ?? rosters.find((roster) => roster.departmentId === departmentId) ?? rosters[0] ?? null
}
