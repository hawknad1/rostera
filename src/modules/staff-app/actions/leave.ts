"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { LeaveError } from "@/modules/leave/errors"
import { createLeaveInputSchema, leaveIdInputSchema } from "@/modules/leave/schemas/leave"
import { cancelLeave, createLeave } from "@/modules/leave/services/leave"
import { StaffAppError } from "@/modules/staff-app/errors"
import { requireMutableStaff } from "@/modules/staff-app/services/identity"

export type StaffLeaveActionState = {
  ok: false
  error: string
} | null

function revalidateStaffLeave() {
  revalidatePath("/me")
  revalidatePath("/me/leave")
  revalidatePath("/leave")
}

export async function createStaffLeaveAction(
  _previousState: StaffLeaveActionState,
  formData: FormData,
): Promise<StaffLeaveActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = createLeaveInputSchema.safeParse({
    leaveType: formData.get("leaveType"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes"),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the leave details.",
    }
  }

  let leave

  try {
    await requireMutableStaff()
    leave = await createLeave({
      leaveType: parsed.data.leaveType,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      notes: parsed.data.notes,
    })
  } catch (error) {
    if (error instanceof StaffAppError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

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

  revalidateStaffLeave()
  revalidatePath(`/me/leave/${leave.id}`)
  redirect(`/me/leave/${leave.id}`)
}

export async function cancelStaffLeaveAction(
  _previousState: StaffLeaveActionState,
  formData: FormData,
): Promise<StaffLeaveActionState> {
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
    await requireMutableStaff()
    const leave = await cancelLeave(parsed.data.id)
    revalidateStaffLeave()
    revalidatePath(`/me/leave/${leave.id}`)
    return null
  } catch (error) {
    if (error instanceof StaffAppError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    if (error instanceof LeaveError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to cancel this leave request. Please try again.",
    }
  }
}
