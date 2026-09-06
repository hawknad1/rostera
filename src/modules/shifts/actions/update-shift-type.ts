"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { ShiftError } from "@/modules/shifts/errors"
import { updateShiftTypeInputSchema } from "@/modules/shifts/schemas/shift-type"
import { updateShiftType } from "@/modules/shifts/services/shift-types"

import type { ShiftActionState } from "./create-shift-type"

export async function updateShiftTypeAction(
  _previousState: ShiftActionState,
  formData: FormData,
): Promise<ShiftActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = updateShiftTypeInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the shift details.",
    }
  }

  try {
    const shiftType = await updateShiftType(parsed.data)
    revalidatePath("/shifts")
    revalidatePath(`/shifts/${shiftType.id}`)
    revalidatePath("/shifts/requirements")
    revalidatePath("/departments")
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
      error: "Unable to update the shift. Please try again.",
    }
  }
}
