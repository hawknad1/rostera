"use server"

import { revalidatePath } from "next/cache"

import { OrganizationAdminError } from "@/modules/organizations/errors"
import {
  changeMembershipRoleInputSchema,
  linkMembershipStaffInputSchema,
  membershipIdInputSchema,
} from "@/modules/organizations/schemas/admin"
import {
  changeMembershipRole,
  deactivateMembership,
  linkMembershipStaff,
  reactivateMembership,
  unlinkMembershipStaff,
} from "@/modules/organizations/services/memberships"

export type MembershipActionState = { ok: false; error: string } | { ok: true } | null

function fromError(error: unknown): MembershipActionState {
  if (error instanceof OrganizationAdminError) {
    return { ok: false, error: error.message }
  }

  return { ok: false, error: "Unable to update membership. Please try again." }
}

export async function changeMembershipRoleAction(
  _previous: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const parsed = changeMembershipRoleInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the role." }
  }

  try {
    await changeMembershipRole(parsed.data)
  } catch (error) {
    return fromError(error)
  }

  revalidatePath("/settings/users")
  return { ok: true }
}

export async function deactivateMembershipAction(formData: FormData): Promise<void> {
  const parsed = membershipIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return
  }

  await deactivateMembership(parsed.data)
  revalidatePath("/settings/users")
}

export async function reactivateMembershipAction(formData: FormData): Promise<void> {
  const parsed = membershipIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return
  }

  await reactivateMembership(parsed.data)
  revalidatePath("/settings/users")
}

export async function linkMembershipStaffAction(
  _previous: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const parsed = linkMembershipStaffInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Select a staff profile." }
  }

  try {
    await linkMembershipStaff(parsed.data)
  } catch (error) {
    return fromError(error)
  }

  revalidatePath("/settings/users")
  return { ok: true }
}

export async function unlinkMembershipStaffAction(formData: FormData): Promise<void> {
  const parsed = membershipIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return
  }

  await unlinkMembershipStaff(parsed.data)
  revalidatePath("/settings/users")
}

export async function changeMembershipRoleFormAction(formData: FormData) {
  await changeMembershipRoleAction(null, formData)
}

export async function linkMembershipStaffFormAction(formData: FormData) {
  await linkMembershipStaffAction(null, formData)
}

