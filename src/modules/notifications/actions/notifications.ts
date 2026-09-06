"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { notificationHref } from "@/modules/notifications/deep-links"
import { NotificationError } from "@/modules/notifications/errors"
import { notificationIdInputSchema } from "@/modules/notifications/schemas/notification"
import {
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/modules/notifications/services/notifications"

function revalidateNotificationViews() {
  revalidatePath("/", "layout")
  revalidatePath("/notifications")
}

async function requireSignedIn() {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }
}

export async function markNotificationReadAction(formData: FormData) {
  await requireSignedIn()
  const parsed = notificationIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return
  }

  try {
    await markNotificationRead(parsed.data.id)
    revalidateNotificationViews()
  } catch (error) {
    if (error instanceof NotificationError && error.code === "UNAUTHENTICATED") {
      redirect("/login")
    }
  }
}

export async function markNotificationUnreadAction(formData: FormData) {
  await requireSignedIn()
  const parsed = notificationIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return
  }

  try {
    await markNotificationUnread(parsed.data.id)
    revalidateNotificationViews()
  } catch (error) {
    if (error instanceof NotificationError && error.code === "UNAUTHENTICATED") {
      redirect("/login")
    }
  }
}

export async function markAllNotificationsReadAction() {
  await requireSignedIn()

  try {
    await markAllNotificationsRead()
    revalidateNotificationViews()
  } catch (error) {
    if (error instanceof NotificationError && error.code === "UNAUTHENTICATED") {
      redirect("/login")
    }
  }
}

export async function openNotificationAction(formData: FormData) {
  await requireSignedIn()
  const parsed = notificationIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    redirect("/notifications")
  }

  let notification

  try {
    notification = await markNotificationRead(parsed.data.id)
  } catch (error) {
    if (error instanceof NotificationError && error.code === "UNAUTHENTICATED") {
      redirect("/login")
    }

    redirect("/notifications")
  }

  revalidateNotificationViews()
  redirect(notificationHref(notification.entityType, notification.entityId))
}
