import { rosterError } from "@/modules/rosters/errors"
import { parentVersion, rosterVersionNumber } from "@/modules/rosters/services/versions"

export type AssignmentSnapshot = {
  id: unknown
  staffId: unknown
  shiftTypeId: unknown
  date: unknown
  shiftStartTime: unknown
  shiftEndTime: unknown
  isOvernight: unknown
  startDateTime: unknown
  endDateTime: unknown
  copiedFromAssignmentId?: unknown
}

export type AssignmentComparisonView = {
  id: string
  staffId: string
  staffName: string
  shiftTypeId: string
  shiftTypeName: string
  date: string
  timeLabel: string
}

export type ChangedAssignmentComparison = {
  previous: AssignmentComparisonView
  current: AssignmentComparisonView
  changedFields: Array<"staff" | "shift" | "date" | "time">
}

export type RosterVersionComparison = {
  previousRosterId: string
  previousVersion: number
  currentRosterId: string
  currentVersion: number
  added: AssignmentComparisonView[]
  removed: AssignmentComparisonView[]
  changed: ChangedAssignmentComparison[]
  unchangedCount: number
}

function asString(value: unknown) {
  return String(value)
}

function assignmentTimeKey(assignment: AssignmentSnapshot) {
  return [
    asString(assignment.shiftStartTime),
    asString(assignment.shiftEndTime),
    asString(assignment.isOvernight),
    asString(assignment.startDateTime),
    asString(assignment.endDateTime),
  ].join("|")
}

function changedFields(previous: AssignmentSnapshot, current: AssignmentSnapshot) {
  const fields: ChangedAssignmentComparison["changedFields"] = []

  if (asString(previous.staffId) !== asString(current.staffId)) {
    fields.push("staff")
  }
  if (asString(previous.shiftTypeId) !== asString(current.shiftTypeId)) {
    fields.push("shift")
  }
  if (asString(previous.date) !== asString(current.date)) {
    fields.push("date")
  }
  if (assignmentTimeKey(previous) !== assignmentTimeKey(current)) {
    fields.push("time")
  }

  return fields
}

function takeMatch<T>(rows: T[], predicate: (row: T) => boolean) {
  const index = rows.findIndex(predicate)
  if (index === -1) {
    return null
  }

  return rows.splice(index, 1)[0] ?? null
}

/**
 * Pair assignments across versions without using the new row ids.
 *
 * Identity, in order:
 * 1. `copiedFromAssignmentId` lineage from the previous version
 * 2. exact `date + shiftTypeId + staffId`
 * 3. same `date + shiftTypeId` (staff replacement on a slot)
 * 4. same `date + staffId` (shift/time change for the same person)
 *
 * Unpaired current rows are added. Unpaired previous rows are removed.
 */
export function diffAssignmentSnapshots(
  previous: AssignmentSnapshot[],
  current: AssignmentSnapshot[],
) {
  const remainingPrevious = [...previous]
  const remainingCurrent = [...current]
  const paired: Array<{ previous: AssignmentSnapshot; current: AssignmentSnapshot }> = []

  for (const assignment of [...remainingCurrent]) {
    const copiedFrom = assignment.copiedFromAssignmentId
      ? asString(assignment.copiedFromAssignmentId)
      : ""
    if (!copiedFrom) {
      continue
    }

    const match = takeMatch(
      remainingPrevious,
      (candidate) => asString(candidate.id) === copiedFrom,
    )
    if (!match) {
      continue
    }

    takeMatch(remainingCurrent, (candidate) => asString(candidate.id) === asString(assignment.id))
    paired.push({ previous: match, current: assignment })
  }

  for (const assignment of [...remainingCurrent]) {
    const match = takeMatch(
      remainingPrevious,
      (candidate) =>
        asString(candidate.date) === asString(assignment.date) &&
        asString(candidate.shiftTypeId) === asString(assignment.shiftTypeId) &&
        asString(candidate.staffId) === asString(assignment.staffId),
    )
    if (!match) {
      continue
    }

    takeMatch(remainingCurrent, (candidate) => asString(candidate.id) === asString(assignment.id))
    paired.push({ previous: match, current: assignment })
  }

  for (const assignment of [...remainingCurrent]) {
    const match = takeMatch(
      remainingPrevious,
      (candidate) =>
        asString(candidate.date) === asString(assignment.date) &&
        asString(candidate.shiftTypeId) === asString(assignment.shiftTypeId),
    )
    if (!match) {
      continue
    }

    takeMatch(remainingCurrent, (candidate) => asString(candidate.id) === asString(assignment.id))
    paired.push({ previous: match, current: assignment })
  }

  for (const assignment of [...remainingCurrent]) {
    const match = takeMatch(
      remainingPrevious,
      (candidate) =>
        asString(candidate.date) === asString(assignment.date) &&
        asString(candidate.staffId) === asString(assignment.staffId),
    )
    if (!match) {
      continue
    }

    takeMatch(remainingCurrent, (candidate) => asString(candidate.id) === asString(assignment.id))
    paired.push({ previous: match, current: assignment })
  }

  const changed = paired.filter((pair) => changedFields(pair.previous, pair.current).length > 0)
  const unchangedCount = paired.length - changed.length

  return {
    added: remainingCurrent,
    removed: remainingPrevious,
    changed: changed.map((pair) => ({
      previous: pair.previous,
      current: pair.current,
      changedFields: changedFields(pair.previous, pair.current),
    })),
    unchangedCount,
  }
}

export function assertComparableVersion<T extends { id: unknown; versionNumber?: unknown; parentRosterId?: unknown }>(
  roster: T,
  versions: T[],
) {
  if (rosterVersionNumber(roster) <= 1) {
    throw rosterError("AMENDMENT_NOT_COMPARABLE")
  }

  const parent = parentVersion(roster, versions)
  if (!parent) {
    throw rosterError("AMENDMENT_NOT_COMPARABLE")
  }

  return parent
}
