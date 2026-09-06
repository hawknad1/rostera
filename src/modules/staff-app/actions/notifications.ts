"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { NotificationError } from "@/modules/notifications/errors"
import { notificationIdInputSchema } from "@/modules/notifications/schemas/notification"
import {
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/modules/notifications/services/notifications"
import { staffNotificationHref } from "@/modules/staff-app/deep-links"

function revalidateStaffNotifications() {
  revalidatePath("/", "layout")
  revalidatePath("/me")
  revalidatePath("/me/notifications")
  revalidatePath("/notifications")
}

async function requireSignedIn() {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }
}

export async function markStaffNotificationReadAction(formData: FormData) {
  await requireSignedIn()
  const parsed = notificationIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return
  }

  try {
    await markNotificationRead(parsed.data.id)
    revalidateStaffNotifications()
  } catch (error) {
    if (error instanceof NotificationError && error.code === "UNAUTHENTICATED") {
      redirect("/login")
    }
  }
}

export async function markStaffNotificationUnreadAction(formData: FormData) {
  await requireSignedIn()
  const parsed = notificationIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return
  }

  try {
    await markNotificationUnread(parsed.data.id)
    revalidateStaffNotifications()
  } catch (error) {
    if (error instanceof NotificationError && error.code === "UNAUTHENTICATED") {
      redirect("/login")
    }
  }
}

export async function markAllStaffNotificationsReadAction() {
  await requireSignedIn()

  try {
    await markAllNotificationsRead()
    revalidateStaffNotifications()
  } catch (error) {
    if (error instanceof NotificationError && error.code === "UNAUTHENTICATED") {
      redirect("/login")
    }
  }
}

export async function openStaffNotificationAction(formData: FormData) {
  await requireSignedIn()
  const parsed = notificationIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    redirect("/me/notifications")
  }

  let notification

  try {
    notification = await markNotificationRead(parsed.data.id)
  } catch (error) {
    if (error instanceof NotificationError && error.code === "UNAUTHENTICATED") {
      redirect("/login")
    }

    redirect("/me/notifications")
  }

  revalidateStaffNotifications()
  redirect(staffNotificationHref(notification.entityType, notification.entityId))
}
