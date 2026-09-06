"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { RosterError } from "@/modules/rosters/errors"
import { updateRosterInputSchema } from "@/modules/rosters/schemas/roster"
import { updateRoster } from "@/modules/rosters/services/rosters"

import type { RosterActionState } from "./create-roster"

export async function updateRosterAction(
  _previousState: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = updateRosterInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the roster details.",
    }
  }

  try {
    const roster = await updateRoster(parsed.data)
    revalidatePath("/rosters")
    revalidatePath(`/rosters/${roster.id}`)
    return null
  } catch (error) {
    if (error instanceof RosterError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to update the roster. Please try again.",
    }
  }
}
