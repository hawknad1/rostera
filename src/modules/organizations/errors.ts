export const organizationProvisioningErrorCodes = [
  "UNAUTHENTICATED",
  "ALREADY_MEMBER",
  "INVALID_INPUT",
  "PROVISIONING_FAILED",
] as const

export type OrganizationProvisioningErrorCode =
  (typeof organizationProvisioningErrorCodes)[number]

export class OrganizationProvisioningError extends Error {
  readonly code: OrganizationProvisioningErrorCode

  constructor(code: OrganizationProvisioningErrorCode, message: string) {
    super(message)
    this.name = "OrganizationProvisioningError"
    this.code = code
  }
}

export function isOrganizationProvisioningError(
  error: unknown,
): error is OrganizationProvisioningError {
  return error instanceof OrganizationProvisioningError
}

export const schedulingPolicyErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "ORGANIZATION_NOT_FOUND",
  "INVALID_SCHEDULING_POLICY",
  "FAILED",
] as const

export type SchedulingPolicyErrorCode = (typeof schedulingPolicyErrorCodes)[number]

export class SchedulingPolicyError extends Error {
  readonly code: SchedulingPolicyErrorCode

  constructor(code: SchedulingPolicyErrorCode, message: string) {
    super(message)
    this.name = "SchedulingPolicyError"
    this.code = code
  }
}

export function isSchedulingPolicyError(error: unknown): error is SchedulingPolicyError {
  return error instanceof SchedulingPolicyError
}

export const schedulingPolicyErrorMessages: Record<SchedulingPolicyErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in to manage scheduling policy.",
  FORBIDDEN: "You do not have permission to perform this action.",
  ORGANIZATION_NOT_FOUND: "Organization not found.",
  INVALID_SCHEDULING_POLICY: "The scheduling policy values are not valid.",
  FAILED: "Unable to update the scheduling policy. Please try again.",
}

export function schedulingPolicyError(code: SchedulingPolicyErrorCode, message?: string) {
  return new SchedulingPolicyError(code, message ?? schedulingPolicyErrorMessages[code])
}
