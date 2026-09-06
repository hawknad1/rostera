"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { StaffError } from "@/modules/staff/errors"
import { assignDepartmentHeadInputSchema } from "@/modules/staff/schemas/staff"
import { assignDepartmentHead } from "@/modules/staff/services/staff"

import type { StaffActionState } from "./create-staff"

export async function assignDepartmentHeadAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = assignDepartmentHeadInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  )

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the department head details.",
    }
  }

  try {
    const department = await assignDepartmentHead(parsed.data)
    revalidatePath("/staff")
    revalidatePath(`/staff/${parsed.data.staffId}`)
    revalidatePath("/departments")
    revalidatePath(`/departments/${department.id}`)
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
      error: "Unable to assign the department head. Please try again.",
    }
  }
}
