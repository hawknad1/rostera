"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { RosterError } from "@/modules/rosters/errors"
import { rosterIdInputSchema } from "@/modules/rosters/schemas/roster"
import { validateRoster } from "@/modules/rosters/services/validation"

import {
  serializeRosterValidation,
  type RosterLifecycleActionState,
} from "./lifecycle-state"

export async function validateRosterAction(
  _previousState: RosterLifecycleActionState,
  formData: FormData,
): Promise<RosterLifecycleActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = rosterIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Roster is required.",
    }
  }

  try {
    const validation = await validateRoster(parsed.data.id)
    revalidatePath(`/rosters/${parsed.data.id}`)
    return {
      ok: true,
      validation: serializeRosterValidation(validation),
    }
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
      error: "Unable to validate the roster. Please try again.",
    }
  }
}
