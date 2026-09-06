"use server"

import { redirect } from "next/navigation"

import { writeActiveOrganizationCookie } from "@/lib/auth/active-organization"
import { getAuthUser } from "@/lib/auth/get-auth-user"
import { OrganizationProvisioningError } from "@/modules/organizations/errors"
import { provisionOrganizationInputSchema } from "@/modules/organizations/schemas/provision-organization"
import { provisionOrganization } from "@/modules/organizations/services/provision-organization"

export type ProvisionOrganizationActionState = {
  ok: false
  error: string
} | null

export async function provisionOrganizationAction(
  _previousState: ProvisionOrganizationActionState,
  formData: FormData,
): Promise<ProvisionOrganizationActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = provisionOrganizationInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  )

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the organization details.",
    }
  }

  try {
    const result = await provisionOrganization(parsed.data)
    await writeActiveOrganizationCookie(result.organization.id)
  } catch (error) {
    if (error instanceof OrganizationProvisioningError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to create the organization. Please try again.",
    }
  }

  redirect("/dashboard")
}
