export const departmentErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "DUPLICATE",
  "IN_USE",
  "FAILED",
] as const

export type DepartmentErrorCode = (typeof departmentErrorCodes)[number]

export class DepartmentError extends Error {
  readonly code: DepartmentErrorCode

  constructor(code: DepartmentErrorCode, message: string) {
    super(message)
    this.name = "DepartmentError"
    this.code = code
  }
}

export function isDepartmentError(error: unknown): error is DepartmentError {
  return error instanceof DepartmentError
}
