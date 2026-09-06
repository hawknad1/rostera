import { Temporal } from "temporal-polyfill"

import { resolveNotificationChannels } from "@/modules/notifications/channels/resolve"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { destinationForChannel, resolveRecipientContact } from "@/modules/notifications/services/contact"
import { getProviderForChannel } from "@/modules/notifications/providers/registry"
import { renderChannelContent } from "@/modules/notifications/templates/render"
import type {
  NotificationChannel,
  NotificationDeliveryProvider,
  NotificationIntent,
} from "@/modules/notifications/types/notification"
import type { PublicOrm } from "@/modules/notifications/types/orm"

function providerFor(channel: NotificationChannel): NotificationDeliveryProvider {
  if (channel === "IN_APP") {
    return "IN_APP"
  }

  return getProviderForChannel(channel)?.provider ?? (channel === "EMAIL" ? "RESEND" : channel === "SMS" ? "TWILIO_SMS" : "TWILIO_WHATSAPP")
}

async function ensureDelivery(
  orm: PublicOrm,
  input: {
    outboxId: string
    notificationId?: string | null
    intent: NotificationIntent
    channel: NotificationChannel
    destination: string | null
    status: "PENDING" | "DELIVERED"
  },
) {
  const content = renderChannelContent(input.intent, input.channel)
  const now = Temporal.Now.instant()

  try {
    await orm.public.NotificationDelivery.create({
      organizationId: input.intent.organizationId,
      notificationOutboxId: input.outboxId,
      recipientUserId: input.intent.recipientUserId,
      eventType: input.intent.type,
      eventId: input.intent.eventId,
      channel: input.channel,
      provider: providerFor(input.channel),
      status: input.status,
      destination: input.destination,
      templateKey: content.templateKey,
      attemptCount: input.status === "DELIVERED" ? 1 : 0,
      availableAt: now,
      sentAt: input.status === "DELIVERED" ? now : null,
      deliveredAt: input.status === "DELIVERED" ? now : null,
      ...(input.notificationId ? { notificationId: input.notificationId } : {}),
    })
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      throw error
    }
  }
}

export async function ensureChannelDeliveries(
  orm: PublicOrm,
  input: {
    outboxId: string
    intent: NotificationIntent
    notificationId?: string | null
  },
) {
  const contact = await resolveRecipientContact(orm, {
    organizationId: input.intent.organizationId,
    recipientUserId: input.intent.recipientUserId,
  })
  const resolutions = await resolveNotificationChannels({
    orm,
    eventType: input.intent.type,
    organizationId: input.intent.organizationId,
    recipientUserId: input.intent.recipientUserId,
    contact,
  })

  await ensureDelivery(orm, {
    outboxId: input.outboxId,
    notificationId: input.notificationId,
    intent: input.intent,
    channel: "IN_APP",
    destination: null,
    status: "DELIVERED",
  })

  for (const resolution of resolutions) {
    if (resolution.channel === "IN_APP" || !resolution.eligible) {
      continue
    }

    await ensureDelivery(orm, {
      outboxId: input.outboxId,
      intent: input.intent,
      channel: resolution.channel,
      destination: destinationForChannel(resolution.channel, contact),
      status: "PENDING",
    })
  }
}
