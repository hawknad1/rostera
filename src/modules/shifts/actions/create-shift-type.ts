"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { ShiftError } from "@/modules/shifts/errors"
import { createShiftTypeInputSchema } from "@/modules/shifts/schemas/shift-type"
import { createShiftType } from "@/modules/shifts/services/shift-types"

export type ShiftActionState = {
  ok: false
  error: string
} | null

export async function createShiftTypeAction(
  _previousState: ShiftActionState,
  formData: FormData,
): Promise<ShiftActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = createShiftTypeInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the shift details.",
    }
  }

  let shiftType

  try {
    shiftType = await createShiftType(parsed.data)
  } catch (error) {
    if (error instanceof ShiftError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to create the shift. Please try again.",
    }
  }

  revalidatePath("/shifts")
  revalidatePath("/shifts/requirements")
  redirect(`/shifts/${shiftType.id}`)
}
