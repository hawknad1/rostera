"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { DepartmentError } from "@/modules/departments/errors"
import { createDepartmentInputSchema } from "@/modules/departments/schemas/department"
import { createDepartment } from "@/modules/departments/services/departments"

export type DepartmentActionState = {
  ok: false
  error: string
} | null

export async function createDepartmentAction(
  _previousState: DepartmentActionState,
  formData: FormData,
): Promise<DepartmentActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = createDepartmentInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the department details.",
    }
  }

  let department

  try {
    department = await createDepartment(parsed.data)
  } catch (error) {
    if (error instanceof DepartmentError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to create the department. Please try again.",
    }
  }

  revalidatePath("/departments")
  redirect(`/departments/${department.id}`)
}
