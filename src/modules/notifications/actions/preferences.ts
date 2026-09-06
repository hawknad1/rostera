"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { NotificationError } from "@/modules/notifications/errors"
import { notificationPreferenceInputSchema } from "@/modules/notifications/schemas/notification"
import { setStaffNotificationPreference } from "@/modules/notifications/services/preferences"

export async function updateStaffNotificationPreferenceAction(formData: FormData) {
  const authUser = await getAuthUser()
  if (!authUser) {
    redirect("/login")
  }

  const parsed = notificationPreferenceInputSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) {
    return
  }

  try {
    await setStaffNotificationPreference({
      eventType: parsed.data.eventType,
      channel: parsed.data.channel,
      enabled: parsed.data.enabled === "true",
    })
    revalidatePath("/me/notifications")
    revalidatePath("/me/notifications/preferences")
  } catch (error) {
    if (error instanceof NotificationError && error.code === "UNAUTHENTICATED") {
      redirect("/login")
    }
  }
}
