"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { AttendanceError } from "@/modules/attendance/errors"
import { clockOut } from "@/modules/attendance/services/clock-out"

export type AttendancePunchState = { ok: false; error: string } | null

export async function clockOutAction(
  _previousState: AttendancePunchState,
  formData: FormData,
): Promise<AttendancePunchState> {
  void formData
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  try {
    await clockOut()
  } catch (error) {
    if (error instanceof AttendanceError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      if (error.code === "FORBIDDEN") {
        redirect("/forbidden")
      }

      return { ok: false, error: error.message }
    }

    return { ok: false, error: "Unable to clock out. Please try again." }
  }

  revalidatePath("/me")
  revalidatePath("/me/attendance")
  revalidatePath("/attendance")
  return null
}
