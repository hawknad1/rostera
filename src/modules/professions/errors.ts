export const professionErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "DUPLICATE",
  "FAILED",
] as const

export type ProfessionErrorCode = (typeof professionErrorCodes)[number]

export class ProfessionError extends Error {
  readonly code: ProfessionErrorCode

  constructor(code: ProfessionErrorCode, message: string) {
    super(message)
    this.name = "ProfessionError"
    this.code = code
  }
}

export function isProfessionError(error: unknown): error is ProfessionError {
  return error instanceof ProfessionError
}
