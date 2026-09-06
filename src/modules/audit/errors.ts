export const auditErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "AUDIT_NOT_FOUND",
  "INVALID_ACTOR",
  "FAILED",
] as const

export type AuditErrorCode = (typeof auditErrorCodes)[number]

export class AuditError extends Error {
  readonly code: AuditErrorCode

  constructor(code: AuditErrorCode, message: string) {
    super(message)
    this.name = "AuditError"
    this.code = code
  }
}

export function isAuditError(error: unknown): error is AuditError {
  return error instanceof AuditError
}

export const auditErrorMessages: Record<AuditErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in to view the audit trail.",
  FORBIDDEN: "You do not have permission to view the audit trail.",
  AUDIT_NOT_FOUND: "Audit event not found.",
  INVALID_ACTOR: "Audit actor context is invalid.",
  FAILED: "Unable to record this audit event.",
}

export function auditError(code: AuditErrorCode) {
  return new AuditError(code, auditErrorMessages[code])
}
