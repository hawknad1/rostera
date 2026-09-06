import { Temporal } from "temporal-polyfill"

import { toInstant } from "@/lib/dates/assignment-window"
import type { AttendancePolicyValues } from "@/modules/attendance/types/attendance"
import type { PublicOrm } from "@/modules/attendance/types/orm"
import { selectCurrentPublishedRosters } from "@/modules/rosters/services/versions"

type AssignmentMatch = {
  id: string
  rosterId: string
  date: string
  departmentId: string
  shiftTypeId: string
  shiftStartTime: string
  shiftEndTime: string
  isOvernight: boolean
  start: Temporal.Instant
  end: Temporal.Instant
}

export async function findMatchingPublishedAssignment(input: {
  orm: PublicOrm
  organizationId: string
  staffId: string
  now: Temporal.Instant
  policy: Pick<
    AttendancePolicyValues,
    "allowEarlyClockIn" | "maximumEarlyClockInMinutes" | "maximumLateClockOutMinutes"
  >
}): Promise<AssignmentMatch | null> {
  const [rosterRows, assignmentRows] = await Promise.all([
    input.orm.public.Roster.where({ organizationId: input.organizationId }).all(),
    input.orm.public.ShiftAssignment.where({
      organizationId: input.organizationId,
      staffId: input.staffId,
    }).all(),
  ])

  const published = selectCurrentPublishedRosters(
    rosterRows.filter((row) => String(row.organizationId) === input.organizationId),
  )
  const publishedById = new Set(published.map((roster) => String(roster.id)))

  const matches: AssignmentMatch[] = []

  for (const row of assignmentRows) {
    if (
      String(row.organizationId) !== input.organizationId ||
      String(row.staffId) !== input.staffId ||
      !publishedById.has(String(row.rosterId))
    ) {
      continue
    }

    const start = toInstant(row.startDateTime)
    const end = toInstant(row.endDateTime)
    const earlyMinutes = input.policy.allowEarlyClockIn
      ? input.policy.maximumEarlyClockInMinutes
      : 0
    const windowStart = start.subtract({ minutes: earlyMinutes })
    const windowEnd = end.add({ minutes: input.policy.maximumLateClockOutMinutes })

    if (
      Temporal.Instant.compare(input.now, windowStart) < 0 ||
      Temporal.Instant.compare(input.now, windowEnd) >= 0
    ) {
      continue
    }

    if (!input.policy.allowEarlyClockIn && Temporal.Instant.compare(input.now, start) < 0) {
      continue
    }

    matches.push({
      id: String(row.id),
      rosterId: String(row.rosterId),
      date: String(row.date),
      departmentId: String(row.departmentId),
      shiftTypeId: String(row.shiftTypeId),
      shiftStartTime: String(row.shiftStartTime),
      shiftEndTime: String(row.shiftEndTime),
      isOvernight: Boolean(row.isOvernight),
      start,
      end,
    })
  }

  if (matches.length === 0) {
    return null
  }

  const covering = matches.filter(
    (assignment) =>
      Temporal.Instant.compare(input.now, assignment.start) >= 0 &&
      Temporal.Instant.compare(input.now, assignment.end) < 0,
  )

  const pool = covering.length > 0 ? covering : matches
  return [...pool].sort((left, right) => Temporal.Instant.compare(left.start, right.start))[0]
}

export async function hasApprovedLeaveCoveringDate(input: {
  orm: PublicOrm
  organizationId: string
  staffId: string
  date: string
}) {
  const rows = await input.orm.public.LeaveRequest.where({
    organizationId: input.organizationId,
    staffId: input.staffId,
    status: "APPROVED",
  }).all()

  return rows.some(
    (row) =>
      String(row.organizationId) === input.organizationId &&
      String(row.staffId) === input.staffId &&
      String(row.status) === "APPROVED" &&
      String(row.startDate) <= input.date &&
      String(row.endDate) >= input.date,
  )
}
