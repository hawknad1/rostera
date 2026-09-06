"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { AttendanceError } from "@/modules/attendance/errors"
import { updateAttendancePolicyFormSchema } from "@/modules/attendance/schemas/corrections"
import { updateAttendancePolicy } from "@/modules/attendance/services/policy-admin"

export type AttendancePolicyActionState =
  | { ok: false; error: string }
  | { ok: true }
  | null

export async function updateAttendancePolicyAction(
  _previous: AttendancePolicyActionState,
  formData: FormData,
): Promise<AttendancePolicyActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = updateAttendancePolicyFormSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the attendance policy values.",
    }
  }

  try {
    await updateAttendancePolicy({
      attendanceEnabled: parsed.data.attendanceEnabled === "on",
      allowUnscheduledAttendance: parsed.data.allowUnscheduledAttendance === "on",
      allowEarlyClockIn: parsed.data.allowEarlyClockIn === "on",
      lateThresholdMinutes: parsed.data.lateThresholdMinutes,
      earlyDepartureThresholdMinutes: parsed.data.earlyDepartureThresholdMinutes,
      overtimeThresholdMinutes: parsed.data.overtimeThresholdMinutes,
      maximumEarlyClockInMinutes: parsed.data.maximumEarlyClockInMinutes,
      maximumLateClockOutMinutes: parsed.data.maximumLateClockOutMinutes,
    })
    revalidatePath("/settings")
    revalidatePath("/settings/attendance")
    return { ok: true }
  } catch (error) {
    if (error instanceof AttendanceError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return { ok: false, error: "Unable to update the attendance policy. Please try again." }
  }
}
