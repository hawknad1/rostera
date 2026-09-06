import {
  assignmentDateTimeWindow,
  intervalsOverlap,
  toInstant,
} from "@/lib/dates/assignment-window"
import { isDateInInclusiveRange } from "@/lib/dates/calendar-date"
import { rosterError } from "@/modules/rosters/errors"

export type RosterRecord = {
  id: string
  organizationId: string
  departmentId: string
  startDate: string
  endDate: string
  status: string
}

export type StaffRecord = {
  id: string
  organizationId: string
  departmentId: string
  professionId?: string | null
  employmentStatus: string
}

export type ShiftTypeRecord = {
  id: string
  organizationId: string
  startTime: string
  endTime: string
  isOvernight: boolean
  isActive: boolean
}

export type ExistingAssignmentRecord = {
  id: string
  rosterId: string
  staffId: string
  shiftTypeId: string
  date: string
  startDateTime: unknown
  endDateTime: unknown
}

export function assertRosterDraft(roster: RosterRecord) {
  if (roster.status !== "DRAFT") {
    throw rosterError("ROSTER_NOT_DRAFT")
  }
}

export function assertAssignmentDateInRoster(date: string, roster: RosterRecord) {
  if (!isDateInInclusiveRange(date, roster.startDate, roster.endDate)) {
    throw rosterError("ASSIGNMENT_OUTSIDE_ROSTER")
  }
}

export function assertStaffAssignable(staff: StaffRecord, roster: RosterRecord) {
  if (staff.employmentStatus !== "ACTIVE") {
    throw rosterError("STAFF_INACTIVE")
  }

  if (staff.departmentId !== roster.departmentId) {
    throw rosterError("STAFF_WRONG_DEPARTMENT")
  }
}

export function assertStaffProfession(staff: StaffRecord) {
  if (!staff.professionId) {
    throw rosterError("STAFF_NO_PROFESSION")
  }

  return staff.professionId
}

export function assertShiftTypeAssignable(shiftType: ShiftTypeRecord) {
  if (!shiftType.isActive) {
    throw rosterError("SHIFT_TYPE_INACTIVE")
  }
}

export function assertNoDuplicateAssignment(
  existing: ExistingAssignmentRecord[],
  input: { rosterId: string; staffId: string; shiftTypeId: string; date: string },
) {
  const duplicate = existing.find(
    (assignment) =>
      assignment.rosterId === input.rosterId &&
      assignment.staffId === input.staffId &&
      assignment.shiftTypeId === input.shiftTypeId &&
      assignment.date === input.date,
  )

  if (duplicate) {
    throw rosterError("ASSIGNMENT_DUPLICATE")
  }
}

export function assertNoOverlappingAssignment(
  existing: ExistingAssignmentRecord[],
  next: { startDateTime: unknown; endDateTime: unknown },
) {
  const nextStart = toInstant(next.startDateTime)
  const nextEnd = toInstant(next.endDateTime)

  const overlapping = existing.find((assignment) =>
    intervalsOverlap(
      toInstant(assignment.startDateTime),
      toInstant(assignment.endDateTime),
      nextStart,
      nextEnd,
    ),
  )

  if (overlapping) {
    throw rosterError("ASSIGNMENT_OVERLAP")
  }
}

export function buildAssignmentWindow(
  input: {
    date: string
    startTime: string
    endTime: string
    isOvernight: boolean
  },
  timeZone: string,
) {
  return assignmentDateTimeWindow({
    ...input,
    timeZone,
  })
}
