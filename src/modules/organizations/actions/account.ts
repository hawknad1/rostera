"use server"

import { revalidatePath } from "next/cache"

import { OrganizationAdminError } from "@/modules/organizations/errors"
import { updateAccountInputSchema } from "@/modules/organizations/schemas/admin"
import { updateAccountProfile } from "@/modules/organizations/services/account"

export type AccountActionState = { ok: false; error: string } | { ok: true } | null

export async function updateAccountAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = updateAccountInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your account details." }
  }

  try {
    await updateAccountProfile(parsed.data)
  } catch (error) {
    if (error instanceof OrganizationAdminError) {
      return { ok: false, error: error.message }
    }

    return { ok: false, error: "Unable to update your account. Please try again." }
  }

  revalidatePath("/settings/account")
  revalidatePath("/me/account")
  return { ok: true }
}
