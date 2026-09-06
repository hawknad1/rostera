import {
  defaultChannelEnabled,
  getEventChannelPolicy,
  isPreferenceLocked,
} from "@/modules/notifications/channels/registry"
import { isChannelProviderConfigured } from "@/modules/notifications/providers/registry"
import { destinationForChannel, type RecipientContact } from "@/modules/notifications/services/contact"
import type { NotificationChannel, NotificationType } from "@/modules/notifications/types/notification"
import type { PublicOrm } from "@/modules/notifications/types/orm"

export type ChannelResolution = {
  channel: NotificationChannel
  eligible: boolean
  reason:
    | "enabled"
    | "in_app"
    | "not_allowed"
    | "preference_disabled"
    | "provider_unconfigured"
    | "missing_destination"
}

export async function loadPreferenceEnabled(
  orm: PublicOrm,
  input: {
    organizationId: string
    userId: string
    eventType: NotificationType
    channel: NotificationChannel
  },
) {
  const row = await orm.public.NotificationPreference.where({
    organizationId: input.organizationId,
    userId: input.userId,
    eventType: input.eventType,
    channel: input.channel,
  }).first()

  if (!row) {
    return defaultChannelEnabled(input.eventType, input.channel)
  }

  return Boolean(row.enabled)
}

export async function resolveNotificationChannels(input: {
  orm: PublicOrm
  eventType: NotificationType
  organizationId: string
  recipientUserId: string
  contact: RecipientContact
}): Promise<ChannelResolution[]> {
  const policy = getEventChannelPolicy(input.eventType)
  const results: ChannelResolution[] = []

  for (const channel of policy.allowedChannels) {
    if (channel === "IN_APP") {
      results.push({ channel, eligible: true, reason: "in_app" })
      continue
    }

    const providerConfigured = isChannelProviderConfigured(channel)
    if (!providerConfigured) {
      results.push({ channel, eligible: false, reason: "provider_unconfigured" })
      continue
    }

    const destination = destinationForChannel(channel, input.contact)
    if (!destination) {
      results.push({ channel, eligible: false, reason: "missing_destination" })
      continue
    }

    const lockedOn = isPreferenceLocked(input.eventType, channel)
    const enabled = lockedOn
      ? true
      : await loadPreferenceEnabled(input.orm, {
          organizationId: input.organizationId,
          userId: input.recipientUserId,
          eventType: input.eventType,
          channel,
        })

    if (!enabled) {
      results.push({ channel, eligible: false, reason: "preference_disabled" })
      continue
    }

    results.push({ channel, eligible: true, reason: "enabled" })
  }

  return results
}
