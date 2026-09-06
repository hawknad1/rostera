"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { DepartmentError } from "@/modules/departments/errors"
import { departmentIdInputSchema } from "@/modules/departments/schemas/department"
import { deleteDepartment } from "@/modules/departments/services/departments"

import type { DepartmentActionState } from "./create-department"

export async function deleteDepartmentAction(
  _previousState: DepartmentActionState,
  formData: FormData,
): Promise<DepartmentActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = departmentIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Department is required.",
    }
  }

  try {
    await deleteDepartment(parsed.data)
  } catch (error) {
    if (error instanceof DepartmentError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to delete the department. Please try again.",
    }
  }

  revalidatePath("/departments")
  redirect("/departments")
}
