export const shiftErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "DUPLICATE",
  "CONFLICT",
  "FAILED",
] as const

export type ShiftErrorCode = (typeof shiftErrorCodes)[number]

export class ShiftError extends Error {
  readonly code: ShiftErrorCode

  constructor(code: ShiftErrorCode, message: string) {
    super(message)
    this.name = "ShiftError"
    this.code = code
  }
}

export function isShiftError(error: unknown): error is ShiftError {
  return error instanceof ShiftError
}
