"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { ShiftError } from "@/modules/shifts/errors"
import { shiftTypeIdInputSchema } from "@/modules/shifts/schemas/shift-type"
import { deactivateShiftType } from "@/modules/shifts/services/shift-types"

import type { ShiftActionState } from "./create-shift-type"

export async function deactivateShiftTypeAction(
  _previousState: ShiftActionState,
  formData: FormData,
): Promise<ShiftActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = shiftTypeIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Shift is required.",
    }
  }

  try {
    const shiftType = await deactivateShiftType(parsed.data)
    revalidatePath("/shifts")
    revalidatePath(`/shifts/${shiftType.id}`)
    revalidatePath("/shifts/requirements")
    return null
  } catch (error) {
    if (error instanceof ShiftError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to deactivate the shift. Please try again.",
    }
  }
}
