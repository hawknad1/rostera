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

export const organizationAdminErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "ORGANIZATION_NOT_FOUND",
  "ORGANIZATION_SUSPENDED",
  "MEMBERSHIP_INACTIVE",
  "NOT_FOUND",
  "INVALID_INPUT",
  "LAST_ADMIN",
  "INVITATION_EXPIRED",
  "INVITATION_REVOKED",
  "INVITATION_ACCEPTED",
  "INVITATION_EMAIL_MISMATCH",
  "INVITATION_RATE_LIMITED",
  "DUPLICATE",
  "ROLE_UNAVAILABLE",
  "CROSS_TENANT",
  "STAFF_ALREADY_LINKED",
  "USER_ALREADY_LINKED",
  "FAILED",
] as const

export type OrganizationAdminErrorCode = (typeof organizationAdminErrorCodes)[number]

export class OrganizationAdminError extends Error {
  readonly code: OrganizationAdminErrorCode

  constructor(code: OrganizationAdminErrorCode, message: string) {
    super(message)
    this.name = "OrganizationAdminError"
    this.code = code
  }
}

export function isOrganizationAdminError(error: unknown): error is OrganizationAdminError {
  return error instanceof OrganizationAdminError
}

export const organizationAdminErrorMessages: Record<OrganizationAdminErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in to manage this organization.",
  FORBIDDEN: "You do not have permission to perform this action.",
  ORGANIZATION_NOT_FOUND: "Organization not found.",
  ORGANIZATION_SUSPENDED: "This organization is suspended.",
  MEMBERSHIP_INACTIVE: "Your membership in this organization is not active.",
  NOT_FOUND: "The requested record was not found.",
  INVALID_INPUT: "Please check the details and try again.",
  LAST_ADMIN: "This organization must keep at least one active administrator.",
  INVITATION_EXPIRED: "This invitation has expired.",
  INVITATION_REVOKED: "This invitation has been revoked.",
  INVITATION_ACCEPTED: "This invitation has already been accepted.",
  INVITATION_EMAIL_MISMATCH: "This invitation was sent to a different email address.",
  INVITATION_RATE_LIMITED: "Please wait before resending this invitation.",
  DUPLICATE: "A pending invitation already exists for this email.",
  ROLE_UNAVAILABLE: "That role is not available in this organization.",
  CROSS_TENANT: "That record does not belong to this organization.",
  STAFF_ALREADY_LINKED: "This staff member is already linked to an account.",
  USER_ALREADY_LINKED: "This user is already linked to a staff profile.",
  FAILED: "Unable to complete this action. Please try again.",
}

export function organizationAdminError(code: OrganizationAdminErrorCode, message?: string) {
  return new OrganizationAdminError(code, message ?? organizationAdminErrorMessages[code])
}
