"use server"

import { revalidatePath } from "next/cache"

import { OrganizationAdminError } from "@/modules/organizations/errors"
import {
  invitationIdInputSchema,
  inviteUserInputSchema,
} from "@/modules/organizations/schemas/admin"
import {
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "@/modules/organizations/services/invitations"

export type InvitationActionState = { ok: false; error: string } | { ok: true } | null

function fromError(error: unknown): InvitationActionState {
  if (error instanceof OrganizationAdminError) {
    return { ok: false, error: error.message }
  }

  return { ok: false, error: "Unable to update the invitation. Please try again." }
}

export async function createInvitationAction(
  _previous: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed = inviteUserInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the invitation details." }
  }

  try {
    await createInvitation(parsed.data)
  } catch (error) {
    return fromError(error)
  }

  revalidatePath("/settings/invitations")
  return { ok: true }
}

export async function resendInvitationAction(formData: FormData): Promise<void> {
  const parsed = invitationIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return
  }

  try {
    await resendInvitation(parsed.data)
  } catch (error) {
    if (error instanceof OrganizationAdminError) {
      return
    }
    throw error
  }

  revalidatePath("/settings/invitations")
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  const parsed = invitationIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return
  }

  try {
    await revokeInvitation(parsed.data)
  } catch (error) {
    if (error instanceof OrganizationAdminError) {
      return
    }
    throw error
  }

  revalidatePath("/settings/invitations")
}
