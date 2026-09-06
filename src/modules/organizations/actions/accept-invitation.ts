"use server"

import { redirect } from "next/navigation"

import { OrganizationAdminError } from "@/modules/organizations/errors"
import { acceptInvitationInputSchema } from "@/modules/organizations/schemas/admin"
import { acceptInvitation } from "@/modules/organizations/services/invitations"

export type AcceptInvitationState = { ok: false; error: string } | null

export async function acceptInvitationAction(
  _previous: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const parsed = acceptInvitationInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invitation token is required." }
  }

  try {
    await acceptInvitation(parsed.data)
  } catch (error) {
    if (error instanceof OrganizationAdminError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect(`/login?next=${encodeURIComponent(`/invite/accept?token=${parsed.data.token}`)}`)
      }

      return { ok: false, error: error.message }
    }

    return { ok: false, error: "Unable to accept this invitation. Please try again." }
  }

  redirect("/dashboard")
}
