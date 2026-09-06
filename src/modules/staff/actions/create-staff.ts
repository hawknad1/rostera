"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { StaffError } from "@/modules/staff/errors"
import { createStaffInputSchema } from "@/modules/staff/schemas/staff"
import { createStaff } from "@/modules/staff/services/staff"

export type StaffActionState = {
  ok: false
  error: string
} | null

export async function createStaffAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = createStaffInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the staff details.",
    }
  }

  let staff

  try {
    staff = await createStaff(parsed.data)
  } catch (error) {
    if (error instanceof StaffError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to create the staff member. Please try again.",
    }
  }

  revalidatePath("/staff")
  redirect(`/staff/${staff.id}`)
}
