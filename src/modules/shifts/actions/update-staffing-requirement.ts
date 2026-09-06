"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { ShiftError } from "@/modules/shifts/errors"
import { updateStaffingRequirementInputSchema } from "@/modules/shifts/schemas/staffing-requirement"
import { updateStaffingRequirement } from "@/modules/shifts/services/staffing-requirements"

import type { StaffingRequirementActionState } from "./create-staffing-requirement"

export async function updateStaffingRequirementAction(
  _previousState: StaffingRequirementActionState,
  formData: FormData,
): Promise<StaffingRequirementActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = updateStaffingRequirementInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  )

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the staffing requirement.",
    }
  }

  try {
    await updateStaffingRequirement(parsed.data)
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
      error: "Unable to update the staffing requirement. Please try again.",
    }
  }
}
