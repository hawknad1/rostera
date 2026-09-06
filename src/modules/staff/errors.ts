export const staffErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "DUPLICATE",
  "CONFLICT",
  "FAILED",
] as const

export type StaffErrorCode = (typeof staffErrorCodes)[number]

export class StaffError extends Error {
  readonly code: StaffErrorCode

  constructor(code: StaffErrorCode, message: string) {
    super(message)
    this.name = "StaffError"
    this.code = code
  }
}

export function isStaffError(error: unknown): error is StaffError {
  return error instanceof StaffError
}
