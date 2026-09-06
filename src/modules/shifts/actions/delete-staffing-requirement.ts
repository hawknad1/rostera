"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { ShiftError } from "@/modules/shifts/errors"
import { staffingRequirementIdInputSchema } from "@/modules/shifts/schemas/staffing-requirement"
import { deleteStaffingRequirement } from "@/modules/shifts/services/staffing-requirements"

import type { StaffingRequirementActionState } from "./create-staffing-requirement"

export async function deleteStaffingRequirementAction(
  _previousState: StaffingRequirementActionState,
  formData: FormData,
): Promise<StaffingRequirementActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = staffingRequirementIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Staffing requirement is required.",
    }
  }

  try {
    await deleteStaffingRequirement(parsed.data)
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
      error: "Unable to delete the staffing requirement. Please try again.",
    }
  }
}
