"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { AttendanceError } from "@/modules/attendance/errors"
import { reviewAttendanceInputSchema } from "@/modules/attendance/schemas/corrections"
import { reviewAttendance } from "@/modules/attendance/services/corrections"

export type AttendanceReviewState = { ok: false; error: string } | null

export async function reviewAttendanceAction(
  _previous: AttendanceReviewState,
  formData: FormData,
): Promise<AttendanceReviewState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = reviewAttendanceInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the review details.",
    }
  }

  try {
    await reviewAttendance(parsed.data)
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

    return { ok: false, error: "Unable to review attendance. Please try again." }
  }

  revalidatePath("/attendance")
  revalidatePath(`/attendance/${parsed.data.id}`)
  revalidatePath("/me/attendance")
  return null
}
