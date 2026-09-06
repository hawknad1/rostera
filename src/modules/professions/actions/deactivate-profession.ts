"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { ProfessionError } from "@/modules/professions/errors"
import { professionIdInputSchema } from "@/modules/professions/schemas/profession"
import { deactivateOrganizationProfession } from "@/modules/professions/services/professions"

import type { ProfessionActionState } from "./create-profession"

export async function deactivateProfessionAction(
  _previousState: ProfessionActionState,
  formData: FormData,
): Promise<ProfessionActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = professionIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Profession is required.",
    }
  }

  try {
    await deactivateOrganizationProfession(parsed.data)
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
      error: "Unable to deactivate the profession. Please try again.",
    }
  }
}
