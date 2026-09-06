"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { ProfessionError } from "@/modules/professions/errors"
import { updateProfessionInputSchema } from "@/modules/professions/schemas/profession"
import { updateOrganizationProfession } from "@/modules/professions/services/professions"

import type { ProfessionActionState } from "./create-profession"

export async function updateProfessionAction(
  _previousState: ProfessionActionState,
  formData: FormData,
): Promise<ProfessionActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = updateProfessionInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the profession details.",
    }
  }

  try {
    await updateOrganizationProfession(parsed.data)
    revalidatePath("/professions")
    return null
  } catch (error) {
    if (error instanceof ProfessionError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to update the profession. Please try again.",
    }
  }
}
