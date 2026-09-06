"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { AttendanceError } from "@/modules/attendance/errors"
import { clockIn } from "@/modules/attendance/services/clock-in"

export type AttendancePunchState = { ok: false; error: string } | null

export async function clockInAction(
  _previousState: AttendancePunchState,
  formData: FormData,
): Promise<AttendancePunchState> {
  void formData
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  try {
    await clockIn()
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

    return { ok: false, error: "Unable to clock in. Please try again." }
  }

  revalidatePath("/me")
  revalidatePath("/me/attendance")
  revalidatePath("/attendance")
  return null
}
