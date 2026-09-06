import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import {
  isPreferenceLocked,
  NOTIFICATION_EVENT_REGISTRY,
  defaultChannelEnabled,
  preferenceGroups,
} from "@/modules/notifications/channels/registry"
import { notificationError } from "@/modules/notifications/errors"
import { isChannelProviderConfigured } from "@/modules/notifications/providers/registry"
import { loadPreferenceEnabled } from "@/modules/notifications/channels/resolve"
import type { NotificationChannel, NotificationType } from "@/modules/notifications/types/notification"
import { db } from "@/prisma/db"

export type PreferenceRow = {
  eventType: NotificationType
  label: string
  channel: NotificationChannel
  enabled: boolean
  locked: boolean
  available: boolean
}

export async function getStaffNotificationPreferences() {
  const membership = await getCurrentMembership()
  if (!membership) {
    throw notificationError("UNAUTHENTICATED")
  }

  const groups = preferenceGroups()
  const items: Array<{
    id: string
    label: string
    events: Array<{
      type: NotificationType
      label: string
      channels: PreferenceRow[]
    }>
  }> = []

  for (const group of groups) {
    const events = []
    for (const event of group.events) {
      const channels: PreferenceRow[] = []
      for (const channel of event.allowedChannels) {
        const available =
          channel === "IN_APP" ? true : isChannelProviderConfigured(channel)
        const locked = isPreferenceLocked(event.type, channel)
        const enabled = await loadPreferenceEnabled(db.orm, {
          organizationId: membership.organizationId,
          userId: membership.userId,
          eventType: event.type,
          channel,
        })
        channels.push({
          eventType: event.type,
          label: event.label,
          channel,
          enabled: locked ? true : enabled,
          locked,
          available,
        })
      }
      events.push({ type: event.type, label: event.label, channels })
    }
    items.push({ id: group.id, label: group.label, events })
  }

  return items
}

export async function setStaffNotificationPreference(input: {
  eventType: NotificationType
  channel: NotificationChannel
  enabled: boolean
}) {
  const membership = await getCurrentMembership()
  if (!membership) {
    throw notificationError("UNAUTHENTICATED")
  }

  const policy = NOTIFICATION_EVENT_REGISTRY.find((entry) => entry.type === input.eventType)
  if (!policy || !policy.allowedChannels.includes(input.channel)) {
    throw notificationError("FAILED")
  }

  if (isPreferenceLocked(input.eventType, input.channel)) {
    throw notificationError("PREFERENCE_LOCKED")
  }

  const existing = await db.orm.public.NotificationPreference.where({
    organizationId: membership.organizationId,
    userId: membership.userId,
    eventType: input.eventType,
    channel: input.channel,
  }).first()

  if (existing) {
    return db.orm.public.NotificationPreference.where({
      id: existing.id,
      organizationId: membership.organizationId,
      userId: membership.userId,
    }).update({
      enabled: input.enabled,
    })
  }

  try {
    return await db.orm.public.NotificationPreference.create({
      organizationId: membership.organizationId,
      userId: membership.userId,
      eventType: input.eventType,
      channel: input.channel,
      enabled: input.enabled,
    })
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      throw error
    }

    const raced = await db.orm.public.NotificationPreference.where({
      organizationId: membership.organizationId,
      userId: membership.userId,
      eventType: input.eventType,
      channel: input.channel,
    }).first()

    return db.orm.public.NotificationPreference.where({
      id: raced!.id,
      organizationId: membership.organizationId,
      userId: membership.userId,
    }).update({
      enabled: input.enabled,
    })
  }
}

export function systemDefaultEnabled(eventType: NotificationType, channel: NotificationChannel) {
  return defaultChannelEnabled(eventType, channel)
}
