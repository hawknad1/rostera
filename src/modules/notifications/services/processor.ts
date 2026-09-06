import { Temporal } from "temporal-polyfill"

import { inAppChannel } from "@/modules/notifications/adapters/in-app"
import { notificationIntentSchema } from "@/modules/notifications/schemas/notification"
import { ensureChannelDeliveries } from "@/modules/notifications/services/deliveries"
import { isAvailable, isLeaseExpired } from "@/modules/notifications/services/time"
import {
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_PROCESSING_LEASE_SECONDS,
  notificationTypes,
  type NotificationType,
  type OutboxPayload,
} from "@/modules/notifications/types/notification"
import type { PublicOrm } from "@/modules/notifications/types/orm"
import { db } from "@/prisma/db"

const GENERIC_DELIVERY_ERROR = "Unable to deliver in-app notification."

function asNotificationType(value: unknown): NotificationType | null {
  return notificationTypes.includes(value as NotificationType)
    ? (value as NotificationType)
    : null
}

function parsePayload(raw: unknown): OutboxPayload {
  if (typeof raw !== "string") {
    return { actorUserId: "", intents: [] }
  }

  try {
    const parsed = JSON.parse(raw) as { actorUserId?: unknown; intents?: unknown }
    const intents = Array.isArray(parsed.intents)
      ? parsed.intents.flatMap((intent) => {
          const result = notificationIntentSchema.safeParse(intent)
          return result.success ? [result.data] : []
        })
      : []

    return {
      actorUserId: typeof parsed.actorUserId === "string" ? parsed.actorUserId : "",
      intents,
    }
  } catch {
    return { actorUserId: "", intents: [] }
  }
}

function backoffSeconds(attempts: number) {
  return 30 * attempts
}

export async function processOutboxEvent(
  input: {
    organizationId: string
    eventType: NotificationType
    eventId: string
  },
  orm: PublicOrm = db.orm,
) {
  const existing = await orm.public.NotificationOutbox.where({
    organizationId: input.organizationId,
    eventType: input.eventType,
    eventId: input.eventId,
  }).first()

  if (!existing) {
    return { status: "MISSING" as const }
  }

  if (existing.status === "COMPLETED") {
    return { status: "COMPLETED" as const }
  }

  if (existing.status === "FAILED") {
    return { status: "FAILED" as const }
  }

  if (existing.status === "PROCESSING") {
    if (!isLeaseExpired(existing.processingStartedAt, NOTIFICATION_PROCESSING_LEASE_SECONDS)) {
      return { status: "PROCESSING" as const }
    }

    const reclaimed = await orm.public.NotificationOutbox.where({
      id: existing.id,
      organizationId: input.organizationId,
      status: "PROCESSING",
    }).update({
      status: "PENDING",
      processingStartedAt: null,
      availableAt: Temporal.Now.instant(),
    })

    if (!reclaimed) {
      return { status: "SKIPPED" as const }
    }
  }

  if (existing.status === "PENDING" && !isAvailable(existing.availableAt)) {
    return { status: "PENDING" as const }
  }

  const claimed = await orm.public.NotificationOutbox.where({
    id: existing.id,
    organizationId: input.organizationId,
    status: "PENDING",
  }).update({
    status: "PROCESSING",
    processingStartedAt: Temporal.Now.instant(),
  })

  if (!claimed) {
    return { status: "SKIPPED" as const }
  }

  const eventType = asNotificationType(claimed.eventType)

  try {
    if (!eventType) {
      throw new Error("invalid event type")
    }

    const payload = parsePayload(claimed.payload)
    const channel = inAppChannel(orm)

    for (const intent of payload.intents) {
      await channel.deliver(intent)
      const notification = await orm.public.Notification.where({
        organizationId: intent.organizationId,
        recipientUserId: intent.recipientUserId,
        type: intent.type,
        eventId: intent.eventId,
      }).first()
      await ensureChannelDeliveries(orm, {
        outboxId: String(claimed.id),
        intent,
        notificationId: notification ? String(notification.id) : null,
      })
    }

    await orm.public.NotificationOutbox.where({
      id: claimed.id,
      organizationId: input.organizationId,
    }).update({
      status: "COMPLETED",
      processedAt: Temporal.Now.instant(),
      processingStartedAt: null,
      attempts: Number(claimed.attempts ?? 0) + 1,
      lastError: null,
    })

    return { status: "COMPLETED" as const }
  } catch {
    const attempts = Number(claimed.attempts ?? 0) + 1
    const failed = attempts >= NOTIFICATION_MAX_ATTEMPTS

    await orm.public.NotificationOutbox.where({
      id: claimed.id,
      organizationId: input.organizationId,
    }).update({
      status: failed ? "FAILED" : "PENDING",
      attempts,
      lastError: GENERIC_DELIVERY_ERROR,
      processingStartedAt: null,
      availableAt: Temporal.Now.instant().add({ seconds: backoffSeconds(attempts) }),
    })

    return { status: failed ? ("FAILED" as const) : ("PENDING" as const) }
  }
}

export async function processEmittedNotification(input: {
  organizationId: string
  type: NotificationType
  eventId: string
}) {
  try {
    await processOutboxEvent({
      organizationId: input.organizationId,
      eventType: input.type,
      eventId: input.eventId,
    })
  } catch {
    // Delivery must not fail the committed domain operation.
  }
}
