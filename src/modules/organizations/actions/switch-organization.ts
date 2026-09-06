"use server"

import { redirect } from "next/navigation"

import { hasAdminSurfaceAccess } from "@/lib/auth/admin-surface"
import { setActiveOrganization } from "@/lib/auth/get-current-membership"
import { switchOrganizationInputSchema } from "@/modules/organizations/schemas/admin"

export type SwitchOrganizationState = { ok: false; error: string } | null

export async function switchOrganizationAction(
  _previous: SwitchOrganizationState,
  formData: FormData,
): Promise<SwitchOrganizationState> {
  const parsed = switchOrganizationInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Select an organization." }
  }

  const membership = await setActiveOrganization(parsed.data.organizationId)

  if (!membership) {
    return { ok: false, error: "That organization is not available." }
  }

  redirect((await hasAdminSurfaceAccess(membership)) ? "/dashboard" : "/me")
}

export async function switchOrganizationFormAction(formData: FormData) {
  await switchOrganizationAction(null, formData)
}
