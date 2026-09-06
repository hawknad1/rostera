export const leaveErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "LEAVE_NOT_FOUND",
  "LEAVE_INVALID_DATE_RANGE",
  "LEAVE_OVERLAP",
  "LEAVE_NOT_PENDING",
  "LEAVE_NOT_CANCELLABLE",
  "STAFF_NOT_ACTIVE",
  "STAFF_NOT_IN_ORGANIZATION",
  "STAFF_NOT_LINKED",
  "LEAVE_NOT_YOURS",
  "FAILED",
] as const

export type LeaveErrorCode = (typeof leaveErrorCodes)[number]

export class LeaveError extends Error {
  readonly code: LeaveErrorCode

  constructor(code: LeaveErrorCode, message: string) {
    super(message)
    this.name = "LeaveError"
    this.code = code
  }
}

export function isLeaveError(error: unknown): error is LeaveError {
  return error instanceof LeaveError
}

export const leaveErrorMessages: Record<LeaveErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in to manage leave.",
  FORBIDDEN: "You do not have permission to perform this action.",
  LEAVE_NOT_FOUND: "Leave request not found.",
  LEAVE_INVALID_DATE_RANGE: "The start date must be on or before the end date.",
  LEAVE_OVERLAP: "This staff member already has overlapping pending or approved leave.",
  LEAVE_NOT_PENDING: "Only pending leave can be approved or rejected.",
  LEAVE_NOT_CANCELLABLE: "This leave request cannot be cancelled.",
  STAFF_NOT_ACTIVE: "This staff member is not active.",
  STAFF_NOT_IN_ORGANIZATION: "Staff member not found.",
  STAFF_NOT_LINKED: "Your account is not linked to a staff record.",
  LEAVE_NOT_YOURS: "You can only request leave for your own staff record.",
  FAILED: "Unable to complete this leave action. Please try again.",
}

export function leaveError(code: LeaveErrorCode) {
  return new LeaveError(code, leaveErrorMessages[code])
}
