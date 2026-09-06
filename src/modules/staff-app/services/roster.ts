import { Temporal } from "temporal-polyfill"

import { formatDisplayDate } from "@/lib/dates/calendar-date"
import {
  rosterSeriesId,
  rosterVersionNumber,
  selectCurrentPublishedRosters,
} from "@/modules/rosters/services/versions"
import {
  compareShiftStart,
  formatTimeWindow,
  instantToIso,
  relativeDayLabel,
  todayInTimeZone,
} from "@/modules/staff-app/format"
import { requireLinkedStaff } from "@/modules/staff-app/services/identity"
import type { StaffIdentityLinked, StaffRosterView, StaffShiftView } from "@/modules/staff-app/types"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm

type RosterRow = {
  id: string
  organizationId: string
  departmentId: string
  name: string
  startDate: string
  endDate: string
  status: string
  seriesId?: unknown
  versionNumber?: unknown
}

type AssignmentRow = {
  id: string
  organizationId: string
  rosterId: string
  departmentId: string
  staffId: string
  shiftTypeId: string
  date: string
  shiftStartTime: string
  shiftEndTime: string
  isOvernight: boolean
  startDateTime: unknown
  endDateTime: unknown
}

export async function loadPublishedStaffContext(identity: StaffIdentityLinked) {
  const organizationId = identity.staff.organizationId
  const [rosterRows, assignmentRows, departmentRows, shiftTypeRows] = await Promise.all([
    db.orm.public.Roster.where({ organizationId }).all(),
    db.orm.public.ShiftAssignment.where({
      organizationId,
      staffId: identity.staff.id,
    }).all(),
    db.orm.public.Department.where({ organizationId }).all(),
    db.orm.public.ShiftType.where({ organizationId }).all(),
  ])

  const tenantRosters = rosterRows.filter((row) => row.organizationId === organizationId)
  const published = selectCurrentPublishedRosters(tenantRosters)
  const publishedById = new Map(published.map((roster) => [String(roster.id), roster]))
  const departments = new Map(
    departmentRows
      .filter((row) => row.organizationId === organizationId)
      .map((row) => [row.id, row]),
  )
  const shiftTypes = new Map(
    shiftTypeRows
      .filter((row) => row.organizationId === organizationId)
      .map((row) => [row.id, row]),
  )

  const assignments = assignmentRows
    .filter(
      (row) =>
        row.organizationId === organizationId &&
        row.staffId === identity.staff.id &&
        publishedById.has(row.rosterId),
    )
    .map((row) =>
      toStaffShiftView(row, publishedById.get(row.rosterId)!, departments, shiftTypes, identity.timeZone),
    )
    .sort(compareShiftStart)

  const rosters = published
    .map((roster) => toStaffRosterView(roster, departments))
    .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.name.localeCompare(right.name))

  return { published, publishedById, assignments, rosters, departments, shiftTypes }
}

export function toStaffRosterView(
  roster: RosterRow,
  departments: Map<string, { id: string; name: string }>,
): StaffRosterView {
  return {
    id: String(roster.id),
    name: String(roster.name),
    departmentId: String(roster.departmentId),
    departmentName: departments.get(String(roster.departmentId))?.name ?? "Unknown department",
    startDate: String(roster.startDate),
    endDate: String(roster.endDate),
    dateRangeLabel: `${formatDisplayDate(String(roster.startDate))} – ${formatDisplayDate(String(roster.endDate))}`,
    versionNumber: rosterVersionNumber(roster),
    seriesId: rosterSeriesId(roster),
    status: "PUBLISHED",
  }
}

export function toStaffShiftView(
  assignment: AssignmentRow,
  roster: RosterRow,
  departments: Map<string, { id: string; name: string }>,
  shiftTypes: Map<string, { id: string; name: string }>,
  timeZone: string,
  now?: Temporal.Instant,
): StaffShiftView {
  const shiftType = shiftTypes.get(assignment.shiftTypeId)

  return {
    id: assignment.id,
    date: assignment.date,
    dateLabel: formatDisplayDate(assignment.date),
    weekdayLabel: parseWeekday(assignment.date),
    relativeDayLabel: relativeDayLabel(assignment.date, timeZone, now),
    shiftTypeName: shiftType?.name ?? "Unknown shift",
    startTime: assignment.shiftStartTime,
    endTime: assignment.shiftEndTime,
    timeLabel: formatTimeWindow(
      assignment.shiftStartTime,
      assignment.shiftEndTime,
      assignment.isOvernight,
    ),
    isOvernight: assignment.isOvernight,
    departmentId: assignment.departmentId,
    departmentName: departments.get(assignment.departmentId)?.name ?? "Unknown department",
    rosterId: roster.id,
    rosterName: String(roster.name),
    rosterVersion: rosterVersionNumber(roster),
    rosterStatus: "PUBLISHED",
    seriesId: rosterSeriesId(roster),
    startDateTime: instantToIso(assignment.startDateTime),
    endDateTime: instantToIso(assignment.endDateTime),
  }
}

function parseWeekday(date: string) {
  try {
    return Temporal.PlainDate.from(date).toLocaleString("en-GB", { weekday: "short" })
  } catch {
    return ""
  }
}

export async function getStaffPublishedRoster(now?: Temporal.Instant) {
  const identity = await requireLinkedStaff()
  const context = await loadPublishedStaffContext(identity)

  return {
    identity,
    rosters: context.rosters,
    assignments: context.assignments.map((assignment) => ({
      ...assignment,
      relativeDayLabel: relativeDayLabel(assignment.date, identity.timeZone, now),
    })),
    today: todayInTimeZone(identity.timeZone, now),
  }
}

export async function findOwnedPublishedAssignment(
  orm: PublicOrm,
  identity: StaffIdentityLinked,
  assignmentId: string,
) {
  const assignment = await orm.public.ShiftAssignment.where({
    id: assignmentId,
    organizationId: identity.staff.organizationId,
  }).first()

  if (
    !assignment ||
    assignment.organizationId !== identity.staff.organizationId ||
    assignment.staffId !== identity.staff.id
  ) {
    return null
  }

  const rosterRows = await orm.public.Roster.where({
    organizationId: identity.staff.organizationId,
  }).all()
  const published = selectCurrentPublishedRosters(
    rosterRows.filter((row) => row.organizationId === identity.staff.organizationId),
  )
  const current = published.find((roster) => String(roster.id) === String(assignment.rosterId))

  if (!current || current.status !== "PUBLISHED") {
    return null
  }

  return { assignment, roster: current }
}
