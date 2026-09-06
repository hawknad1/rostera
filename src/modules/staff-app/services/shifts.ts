import { Temporal } from "temporal-polyfill"

import { staffAppError } from "@/modules/staff-app/errors"
import { isShiftInProgress, relativeDayLabel } from "@/modules/staff-app/format"
import { requireLinkedStaff } from "@/modules/staff-app/services/identity"
import {
  findOwnedPublishedAssignment,
  loadPublishedStaffContext,
  toStaffShiftView,
} from "@/modules/staff-app/services/roster"
import type { StaffShiftDetail, StaffShiftView } from "@/modules/staff-app/types"
import { db } from "@/prisma/db"

export async function listStaffShifts(now?: Temporal.Instant) {
  const identity = await requireLinkedStaff()
  const context = await loadPublishedStaffContext(identity)
  const assignments = context.assignments.map((assignment) => ({
    ...assignment,
    relativeDayLabel: relativeDayLabel(assignment.date, identity.timeZone, now),
  }))

  return {
    identity,
    upcoming: upcomingShifts(assignments, identity.timeZone, now),
    assignments,
  }
}

export async function getStaffShift(assignmentId: string, now?: Temporal.Instant): Promise<StaffShiftDetail> {
  const identity = await requireLinkedStaff()
  const found = await findOwnedPublishedAssignment(db.orm, identity, assignmentId)

  if (!found) {
    throw staffAppError("NOT_FOUND")
  }

  const [departments, shiftTypes] = await Promise.all([
    db.orm.public.Department.where({ organizationId: identity.staff.organizationId }).all(),
    db.orm.public.ShiftType.where({ organizationId: identity.staff.organizationId }).all(),
  ])
  const departmentMap = new Map(
    departments
      .filter((row) => row.organizationId === identity.staff.organizationId)
      .map((row) => [row.id, row]),
  )
  const shiftTypeMap = new Map(
    shiftTypes
      .filter((row) => row.organizationId === identity.staff.organizationId)
      .map((row) => [row.id, row]),
  )

  const view = toStaffShiftView(
    found.assignment,
    found.roster,
    departmentMap,
    shiftTypeMap,
    identity.timeZone,
    now,
  )

  return withShiftDetail(view, identity.canMutate, now)
}

export function upcomingShifts(
  assignments: StaffShiftView[],
  timeZone: string,
  now?: Temporal.Instant,
  limit = 8,
) {
  const current = now ?? Temporal.Now.instant()

  return assignments
    .filter((assignment) => {
      try {
        return Temporal.Instant.compare(Temporal.Instant.from(assignment.endDateTime), current) > 0
      } catch {
        return assignment.date >= current.toZonedDateTimeISO(timeZone).toPlainDate().toString()
      }
    })
    .slice(0, limit)
}

export function currentShift(assignments: StaffShiftView[], now?: Temporal.Instant) {
  return (
    assignments.find((assignment) =>
      isShiftInProgress(assignment.startDateTime, assignment.endDateTime, now),
    ) ?? null
  )
}

export function nextShift(assignments: StaffShiftView[], now?: Temporal.Instant) {
  const current = now ?? Temporal.Now.instant()
  const inProgress = currentShift(assignments, current)
  if (inProgress) {
    return inProgress
  }

  return (
    assignments.find((assignment) => {
      try {
        return Temporal.Instant.compare(Temporal.Instant.from(assignment.startDateTime), current) > 0
      } catch {
        return false
      }
    }) ?? null
  )
}

export function withShiftDetail(
  assignment: StaffShiftView,
  canMutate: boolean,
  now?: Temporal.Instant,
): StaffShiftDetail {
  const published = assignment.rosterStatus === "PUBLISHED"
  const swapEligible = canMutate && published
  const swapEligibilityNote = !canMutate
    ? "This account cannot request a swap."
    : published
      ? "You can request a swap. It must be approved before the roster changes. Published shifts are not changed until a roster manager creates an amendment."
      : "This shift is not on the current published roster."

  return {
    ...assignment,
    relativeDayLabel: assignment.relativeDayLabel,
    isCurrent: isShiftInProgress(assignment.startDateTime, assignment.endDateTime, now),
    swapEligible,
    swapEligibilityNote,
  }
}
