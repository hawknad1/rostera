"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { RosterError } from "@/modules/rosters/errors"
import { createRosterInputSchema } from "@/modules/rosters/schemas/roster"
import { createRoster } from "@/modules/rosters/services/rosters"

export type RosterActionState = {
  ok: false
  error: string
} | null

export async function createRosterAction(
  _previousState: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = createRosterInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the roster details.",
    }
  }

  let roster

  try {
    roster = await createRoster(parsed.data)
  } catch (error) {
    if (error instanceof RosterError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to create the roster. Please try again.",
    }
  }

  revalidatePath("/rosters")
  redirect(`/rosters/${roster.id}`)
}
