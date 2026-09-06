import { rosterError } from "@/modules/rosters/errors"
import { rosterStatusLabels, type RosterStatus } from "@/modules/rosters/labels"

const allowedTransitions: Record<RosterStatus, readonly RosterStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "PUBLISHED"],
  PUBLISHED: [],
  AMENDED: [],
}

export function isRosterStatus(value: string): value is RosterStatus {
  return Object.hasOwn(rosterStatusLabels, value)
}

export function assertRosterTransition(from: string, to: RosterStatus) {
  if (from === "PUBLISHED") {
    throw rosterError("ROSTER_ALREADY_PUBLISHED")
  }

  if (!isRosterStatus(from)) {
    throw rosterError("INVALID_ROSTER_TRANSITION")
  }

  if (allowedTransitions[from].includes(to)) {
    return
  }

  if (to === "PUBLISHED") {
    throw rosterError("ROSTER_NOT_PUBLISHABLE")
  }

  if (to === "IN_REVIEW") {
    throw rosterError("ROSTER_NOT_REVIEWABLE")
  }

  throw rosterError("INVALID_ROSTER_TRANSITION")
}
