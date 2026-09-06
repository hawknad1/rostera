"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { RosterError } from "@/modules/rosters/errors"
import { assignmentIdInputSchema } from "@/modules/rosters/schemas/assignment"
import { deleteAssignment } from "@/modules/rosters/services/assignments"

import type { AssignmentActionState } from "./create-assignment"

export async function deleteAssignmentAction(
  _previousState: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = assignmentIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Assignment is required.",
    }
  }

  try {
    const assignment = await deleteAssignment(parsed.data)
    revalidatePath("/rosters")
    revalidatePath(`/rosters/${assignment.rosterId}`)
    return null
  } catch (error) {
    if (error instanceof RosterError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to remove the assignment. Please try again.",
    }
  }
}
