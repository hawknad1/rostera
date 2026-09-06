"use server"

import { revalidatePath } from "next/cache"

import { OrganizationAdminError } from "@/modules/organizations/errors"
import { updateOrganizationInputSchema } from "@/modules/organizations/schemas/admin"
import {
  reactivateOrganization,
  suspendOrganization,
  updateOrganizationSettings,
} from "@/modules/organizations/services/organization"

export type OrganizationSettingsState = { ok: false; error: string } | { ok: true } | null

function fromError(error: unknown): OrganizationSettingsState {
  if (error instanceof OrganizationAdminError) {
    return { ok: false, error: error.message }
  }

  return { ok: false, error: "Unable to update the organization. Please try again." }
}

export async function updateOrganizationAction(
  _previous: OrganizationSettingsState,
  formData: FormData,
): Promise<OrganizationSettingsState> {
  const parsed = updateOrganizationInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the organization details." }
  }

  try {
    await updateOrganizationSettings(parsed.data)
  } catch (error) {
    return fromError(error)
  }

  revalidatePath("/settings/organization")
  return { ok: true }
}

export async function suspendOrganizationAction(): Promise<void> {
  await suspendOrganization()
  revalidatePath("/")
}

export async function reactivateOrganizationAction(): Promise<void> {
  await reactivateOrganization()
  revalidatePath("/")
}
