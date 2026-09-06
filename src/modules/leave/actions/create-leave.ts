"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { LeaveError } from "@/modules/leave/errors"
import { createLeaveInputSchema } from "@/modules/leave/schemas/leave"
import { createLeave } from "@/modules/leave/services/leave"

export type LeaveActionState = {
  ok: false
  error: string
} | null

export async function createLeaveAction(
  _previousState: LeaveActionState,
  formData: FormData,
): Promise<LeaveActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = createLeaveInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the leave details.",
    }
  }

  let leave

  try {
    leave = await createLeave(parsed.data)
  } catch (error) {
    if (error instanceof LeaveError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to create the leave request. Please try again.",
    }
  }

  revalidatePath("/leave")
  redirect(`/leave/${leave.id}`)
}
