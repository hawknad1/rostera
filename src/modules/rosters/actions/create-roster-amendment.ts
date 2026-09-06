"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { RosterError } from "@/modules/rosters/errors"
import { createRosterAmendmentInputSchema } from "@/modules/rosters/schemas/roster"
import { createRosterAmendment } from "@/modules/rosters/services/amendments"

import type { RosterLifecycleActionState } from "./lifecycle-state"

export async function createRosterAmendmentAction(
  _previousState: RosterLifecycleActionState,
  formData: FormData,
): Promise<RosterLifecycleActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = createRosterAmendmentInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the amendment details.",
    }
  }

  let amendment

  try {
    amendment = await createRosterAmendment(parsed.data)
  } catch (error) {
    if (error instanceof RosterError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return {
        ok: false,
        error: error.message,
        code: error.code,
      }
    }

    return {
      ok: false,
      error: "Unable to create the amendment. Please try again.",
    }
  }

  revalidatePath("/rosters")
  revalidatePath(`/rosters/${parsed.data.rosterId}`)
  revalidatePath(`/rosters/${amendment.id}`)
  redirect(`/rosters/${amendment.id}`)
}
