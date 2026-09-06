export const reportErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "REPORT_UNAUTHORIZED",
  "INVALID_DATE_RANGE",
  "INVALID_FILTER",
  "REPORT_TOO_LARGE",
  "EXPORT_NOT_ALLOWED",
  "FAILED",
] as const

export type ReportErrorCode = (typeof reportErrorCodes)[number]

export class ReportError extends Error {
  readonly code: ReportErrorCode

  constructor(code: ReportErrorCode, message: string) {
    super(message)
    this.name = "ReportError"
    this.code = code
  }
}

export function isReportError(error: unknown): error is ReportError {
  return error instanceof ReportError
}

export const reportErrorMessages: Record<ReportErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in to view reports.",
  FORBIDDEN: "You do not have permission to view reports.",
  REPORT_UNAUTHORIZED: "You do not have permission to view reports.",
  INVALID_DATE_RANGE: "Enter a valid reporting period. The end date must be on or after the start date.",
  INVALID_FILTER: "One or more report filters are not valid for this organization.",
  REPORT_TOO_LARGE: "The selected reporting period is too large. Choose a shorter date range.",
  EXPORT_NOT_ALLOWED: "You do not have permission to export reports.",
  FAILED: "Unable to generate this report. Please try again.",
}

export function reportError(code: ReportErrorCode, message?: string) {
  return new ReportError(code, message ?? reportErrorMessages[code])
}
