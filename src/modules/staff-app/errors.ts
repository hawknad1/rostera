export const staffAppErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "STAFF_NOT_LINKED",
  "STAFF_TERMINATED",
  "STAFF_NOT_ACTIVE",
  "NOT_FOUND",
  "FAILED",
] as const

export type StaffAppErrorCode = (typeof staffAppErrorCodes)[number]

export class StaffAppError extends Error {
  readonly code: StaffAppErrorCode

  constructor(code: StaffAppErrorCode, message: string) {
    super(message)
    this.name = "StaffAppError"
    this.code = code
  }
}

export function isStaffAppError(error: unknown): error is StaffAppError {
  return error instanceof StaffAppError
}

export const staffAppErrorMessages: Record<StaffAppErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in to use staff self-service.",
  FORBIDDEN: "You do not have permission to perform this action.",
  STAFF_NOT_LINKED:
    "Your account is not yet linked to a staff profile. Please contact your Rostera administrator.",
  STAFF_TERMINATED: "This staff profile is no longer active, so new requests cannot be submitted.",
  STAFF_NOT_ACTIVE: "Only active staff can submit leave, swap, or attendance requests.",
  NOT_FOUND: "That record was not found.",
  FAILED: "Unable to complete this action. Please try again.",
}

export function staffAppError(code: StaffAppErrorCode) {
  return new StaffAppError(code, staffAppErrorMessages[code])
}
