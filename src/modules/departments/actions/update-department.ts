"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { DepartmentError } from "@/modules/departments/errors"
import { updateDepartmentInputSchema } from "@/modules/departments/schemas/department"
import { updateDepartment } from "@/modules/departments/services/departments"

import type { DepartmentActionState } from "./create-department"

export async function updateDepartmentAction(
  _previousState: DepartmentActionState,
  formData: FormData,
): Promise<DepartmentActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = updateDepartmentInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the department details.",
    }
  }

  try {
    const department = await updateDepartment(parsed.data)
    revalidatePath("/departments")
    revalidatePath(`/departments/${department.id}`)
    return null
  } catch (error) {
    if (error instanceof DepartmentError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to update the department. Please try again.",
    }
  }
}
