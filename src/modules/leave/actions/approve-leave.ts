"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { LeaveError } from "@/modules/leave/errors"
import { leaveIdInputSchema } from "@/modules/leave/schemas/leave"
import { approveLeave } from "@/modules/leave/services/leave"

export type LeaveReviewActionState = {
  ok: false
  error: string
} | null

export async function approveLeaveAction(
  _previousState: LeaveReviewActionState,
  formData: FormData,
): Promise<LeaveReviewActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = leaveIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Leave request is required.",
    }
  }

  try {
    const leave = await approveLeave(parsed.data.id)
    revalidatePath("/leave")
    revalidatePath(`/leave/${leave.id}`)
    revalidatePath("/rosters")
    return null
  } catch (error) {
    if (error instanceof LeaveError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to approve this leave request. Please try again.",
    }
  }
}
