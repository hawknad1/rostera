"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { AttendanceError } from "@/modules/attendance/errors"
import { correctAttendanceInputSchema } from "@/modules/attendance/schemas/corrections"
import { correctAttendance } from "@/modules/attendance/services/corrections"
import { parseDatetimeLocal } from "@/modules/attendance/services/time"

export type AttendanceCorrectionState = { ok: false; error: string } | null

export async function correctAttendanceAction(
  _previous: AttendanceCorrectionState,
  formData: FormData,
): Promise<AttendanceCorrectionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const membership = await getCurrentMembership()
  if (!membership) {
    redirect("/login")
  }

  const timeZone = String(membership.organization.timezone)
  const raw = Object.fromEntries(formData.entries())

  let clockIn: string | undefined
  let clockOut: string | undefined

  try {
    if (typeof raw.clockIn === "string" && raw.clockIn.trim()) {
      clockIn = parseDatetimeLocal(raw.clockIn, timeZone).toString()
    }

    if (typeof raw.clockOut === "string" && raw.clockOut.trim()) {
      clockOut = parseDatetimeLocal(raw.clockOut, timeZone).toString()
    }
  } catch {
    return { ok: false, error: "Enter a valid date and time." }
  }

  const parsed = correctAttendanceInputSchema.safeParse({
    id: raw.id,
    reason: raw.reason,
    clockIn,
    clockOut,
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the correction details.",
    }
  }

  try {
    await correctAttendance(parsed.data)
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

    return { ok: false, error: "Unable to correct attendance. Please try again." }
  }

  revalidatePath("/attendance")
  revalidatePath(`/attendance/${parsed.data.id}`)
  revalidatePath("/me/attendance")
  return null
}
