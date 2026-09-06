"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { RosterError } from "@/modules/rosters/errors"
import { createAssignmentInputSchema } from "@/modules/rosters/schemas/assignment"
import { createAssignment } from "@/modules/rosters/services/assignments"

export type AssignmentWarning = {
  code: string
  severity: string
  message: string
}

export type AssignmentActionState =
  | { ok: false; error: string }
  | { ok: true; warnings: AssignmentWarning[] }
  | null

export async function createAssignmentAction(
  _previousState: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = createAssignmentInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the assignment details.",
    }
  }

  try {
    const { assignment, warnings } = await createAssignment(parsed.data)
    revalidatePath("/rosters")
    revalidatePath(`/rosters/${assignment.rosterId}`)
    return {
      ok: true,
      warnings: warnings.map((warning) => ({
        code: warning.code,
        severity: warning.severity,
        message: warning.message,
      })),
    }
  } catch (error) {
    if (error instanceof RosterError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to add the assignment. Please try again.",
    }
  }
}
