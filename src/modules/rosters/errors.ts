import type { RosterValidationResult } from "@/modules/rosters/types/validation"

export const rosterErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "ROSTER_NOT_FOUND",
  "ROSTER_NOT_DRAFT",
  "INVALID_ROSTER_DATE_RANGE",
  "DEPARTMENT_NOT_FOUND",
  "STAFF_NOT_FOUND",
  "STAFF_INACTIVE",
  "STAFF_WRONG_DEPARTMENT",
  "STAFF_NO_PROFESSION",
  "SHIFT_TYPE_NOT_FOUND",
  "SHIFT_TYPE_INACTIVE",
  "ASSIGNMENT_NOT_FOUND",
  "ASSIGNMENT_OUTSIDE_ROSTER",
  "ASSIGNMENT_DUPLICATE",
  "ASSIGNMENT_OVERLAP",
  "LEAVE_CONFLICT",
  "INSUFFICIENT_REST",
  "MAXIMUM_HOURS_EXCEEDED",
  "CONSECUTIVE_SHIFT_LIMIT",
  "QUALIFICATION_MISMATCH",
  "NIGHT_SHIFT_LIMIT",
  "WEEKEND_LIMIT",
  "INVALID_ROSTER_TRANSITION",
  "ROSTER_NOT_REVIEWABLE",
  "ROSTER_NOT_PUBLISHABLE",
  "ROSTER_HAS_BLOCKING_CONFLICTS",
  "ROSTER_ALREADY_PUBLISHED",
  "ROSTER_NOT_PUBLISHED",
  "NOT_CURRENT_PUBLISHED_VERSION",
  "AMENDMENT_ALREADY_EXISTS",
  "INVALID_AMENDMENT_REASON",
  "AMENDMENT_NOT_COMPARABLE",
  "FAILED",
] as const

export type RosterErrorCode = (typeof rosterErrorCodes)[number]

export class RosterError extends Error {
  readonly code: RosterErrorCode
  readonly validation?: RosterValidationResult

  constructor(code: RosterErrorCode, message: string, validation?: RosterValidationResult) {
    super(message)
    this.name = "RosterError"
    this.code = code
    this.validation = validation
  }
}

export function isRosterError(error: unknown): error is RosterError {
  return error instanceof RosterError
}

export const rosterErrorMessages: Record<RosterErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in to manage rosters.",
  FORBIDDEN: "You do not have permission to perform this action.",
  ROSTER_NOT_FOUND: "Roster not found.",
  ROSTER_NOT_DRAFT: "This roster cannot be changed because it is not a draft.",
  INVALID_ROSTER_DATE_RANGE: "The start date must be on or before the end date.",
  DEPARTMENT_NOT_FOUND: "Department not found.",
  STAFF_NOT_FOUND: "Staff member not found.",
  STAFF_INACTIVE: "This staff member is not active.",
  STAFF_WRONG_DEPARTMENT: "This staff member does not belong to this department.",
  STAFF_NO_PROFESSION: "This staff member does not have a profession.",
  SHIFT_TYPE_NOT_FOUND: "Shift not found.",
  SHIFT_TYPE_INACTIVE: "This shift is not active.",
  ASSIGNMENT_NOT_FOUND: "Assignment not found.",
  ASSIGNMENT_OUTSIDE_ROSTER: "The assignment date must fall within the roster period.",
  ASSIGNMENT_DUPLICATE: "This staff member is already assigned to this shift on this date.",
  ASSIGNMENT_OVERLAP: "This assignment overlaps another shift for this staff member.",
  LEAVE_CONFLICT: "This assignment overlaps approved leave.",
  INSUFFICIENT_REST: "Insufficient rest since the previous shift.",
  MAXIMUM_HOURS_EXCEEDED: "This assignment exceeds the maximum working hours.",
  CONSECUTIVE_SHIFT_LIMIT: "This assignment exceeds the consecutive workday limit.",
  QUALIFICATION_MISMATCH: "This staff member's profession is not compatible with this assignment.",
  NIGHT_SHIFT_LIMIT: "This assignment exceeds the recommended night-shift limit.",
  WEEKEND_LIMIT: "This assignment exceeds the weekend shift limit.",
  INVALID_ROSTER_TRANSITION: "This roster status change is not allowed.",
  ROSTER_NOT_REVIEWABLE: "This roster cannot be submitted for review.",
  ROSTER_NOT_PUBLISHABLE: "This roster cannot be published.",
  ROSTER_HAS_BLOCKING_CONFLICTS: "This roster cannot proceed because it has blocking conflicts.",
  ROSTER_ALREADY_PUBLISHED: "This roster has already been published and cannot be changed.",
  ROSTER_NOT_PUBLISHED: "Only a published roster can be amended.",
  NOT_CURRENT_PUBLISHED_VERSION:
    "Only the current published version of this roster can be amended or used as the publish source.",
  AMENDMENT_ALREADY_EXISTS: "An unpublished amendment already exists for this roster.",
  INVALID_AMENDMENT_REASON: "Enter a short reason for this amendment.",
  AMENDMENT_NOT_COMPARABLE: "This roster version cannot be compared with a previous version.",
  FAILED: "Unable to complete this roster action. Please try again.",
}

export function rosterError(code: RosterErrorCode, validation?: RosterValidationResult) {
  return new RosterError(code, rosterErrorMessages[code], validation)
}
