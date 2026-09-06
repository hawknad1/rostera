"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { StaffError } from "@/modules/staff/errors"
import { staffIdInputSchema } from "@/modules/staff/schemas/staff"
import { deactivateStaff } from "@/modules/staff/services/staff"

import type { StaffActionState } from "./create-staff"

export async function deactivateStaffAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = staffIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Staff member is required.",
    }
  }

  try {
    const staff = await deactivateStaff(parsed.data)
    revalidatePath("/staff")
    revalidatePath(`/staff/${staff.id}`)
    revalidatePath("/departments")
    return null
  } catch (error) {
    if (error instanceof StaffError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to deactivate the staff member. Please try again.",
    }
  }
}
