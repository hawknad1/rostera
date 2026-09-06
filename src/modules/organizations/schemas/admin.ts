import { z } from "zod"

export const organizationTypes = ["HOSPITAL", "CLINIC", "HEALTH_SYSTEM", "OTHER"] as const

export type OrganizationType = (typeof organizationTypes)[number]

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

export function isIanaTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().min(1).max(200).optional())

export const updateOrganizationInputSchema = z.object({
  name: z.preprocess(
    emptyToUndefined,
    z.string("Organization name is required.").trim().min(1, "Organization name is required.").max(200),
  ),
  organizationType: z.enum(organizationTypes),
  phone: optionalText,
  email: z.preprocess(emptyToUndefined, z.email("Enter a valid email address.").optional()),
  address: optionalText,
  city: optionalText,
  region: optionalText,
  country: z.preprocess(
    emptyToUndefined,
    z.string("Country is required.").trim().min(1, "Country is required.").max(120),
  ),
  timezone: z.preprocess(
    emptyToUndefined,
    z
      .string("Timezone is required.")
      .trim()
      .min(1, "Timezone is required.")
      .refine(isIanaTimeZone, "Enter a valid IANA timezone."),
  ),
})

export type UpdateOrganizationInput = z.output<typeof updateOrganizationInputSchema>

export const inviteUserInputSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email("Enter a valid email address."),
  ),
  roleId: z.string().trim().min(1, "Role is required."),
})

export type InviteUserInput = z.output<typeof inviteUserInputSchema>

export const invitationIdInputSchema = z.object({
  invitationId: z.string().trim().min(1, "Invitation is required."),
})

export type InvitationIdInput = z.output<typeof invitationIdInputSchema>

export const acceptInvitationInputSchema = z.object({
  token: z.string().trim().min(1, "Invitation token is required."),
})

export type AcceptInvitationInput = z.output<typeof acceptInvitationInputSchema>

export const membershipIdInputSchema = z.object({
  membershipId: z.string().trim().min(1, "Membership is required."),
})

export const changeMembershipRoleInputSchema = membershipIdInputSchema.extend({
  roleId: z.string().trim().min(1, "Role is required."),
})

export type ChangeMembershipRoleInput = z.output<typeof changeMembershipRoleInputSchema>

export const linkMembershipStaffInputSchema = membershipIdInputSchema.extend({
  staffId: z.string().trim().min(1, "Staff member is required."),
})

export type LinkMembershipStaffInput = z.output<typeof linkMembershipStaffInputSchema>

export const createCustomRoleInputSchema = z.object({
  name: z.preprocess(
    emptyToUndefined,
    z.string("Role name is required.").trim().min(1, "Role name is required.").max(80),
  ),
  description: optionalText,
  permissionKeys: z.array(z.string().trim().min(1)).default([]),
})

export type CreateCustomRoleInput = z.output<typeof createCustomRoleInputSchema>

export const updateCustomRoleInputSchema = z.object({
  roleId: z.string().trim().min(1, "Role is required."),
  name: z.preprocess(
    emptyToUndefined,
    z.string("Role name is required.").trim().min(1, "Role name is required.").max(80),
  ),
  description: optionalText,
  permissionKeys: z.array(z.string().trim().min(1)).default([]),
})

export type UpdateCustomRoleInput = z.output<typeof updateCustomRoleInputSchema>

export const roleIdInputSchema = z.object({
  roleId: z.string().trim().min(1, "Role is required."),
})

export const updateAccountInputSchema = z.object({
  displayName: optionalText,
  phone: optionalText,
})

export type UpdateAccountInput = z.output<typeof updateAccountInputSchema>

export const switchOrganizationInputSchema = z.object({
  organizationId: z.string().trim().min(1, "Organization is required."),
})

export type SwitchOrganizationInput = z.output<typeof switchOrganizationInputSchema>
