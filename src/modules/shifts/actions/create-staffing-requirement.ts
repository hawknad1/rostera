"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { ShiftError } from "@/modules/shifts/errors"
import { createStaffingRequirementInputSchema } from "@/modules/shifts/schemas/staffing-requirement"
import { createStaffingRequirement } from "@/modules/shifts/services/staffing-requirements"

export type StaffingRequirementActionState = {
  ok: false
  error: string
} | null

export async function createStaffingRequirementAction(
  _previousState: StaffingRequirementActionState,
  formData: FormData,
): Promise<StaffingRequirementActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = createStaffingRequirementInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  )

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the staffing requirement.",
    }
  }

  try {
    await createStaffingRequirement(parsed.data)
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
      error: "Unable to create the staffing requirement. Please try again.",
    }
  }
}
