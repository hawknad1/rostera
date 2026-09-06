import { Temporal } from "temporal-polyfill"

import { maskDestination } from "@/modules/notifications/mask"
import { adminSafeDeliveryError, sanitizedDeliveryError } from "@/modules/notifications/providers/errors"
import { getProviderForChannel } from "@/modules/notifications/providers/registry"
import { processOutboxEvent } from "@/modules/notifications/services/processor"
import { deliveryBackoffSeconds, instantMs, isAvailable, isLeaseExpired } from "@/modules/notifications/services/time"
import { renderChannelContent } from "@/modules/notifications/templates/render"
import {
  NOTIFICATION_DELIVERY_MAX_ATTEMPTS,
  NOTIFICATION_PROCESSING_LEASE_SECONDS,
  NOTIFICATION_WORKER_BATCH_SIZE,
  notificationChannels,
  notificationTypes,
  type NotificationChannel,
  type NotificationType,
} from "@/modules/notifications/types/notification"
import type { PublicOrm } from "@/modules/notifications/types/orm"
import { db } from "@/prisma/db"

type DeliveryRow = {
  id: unknown
  organizationId: unknown
  eventType: unknown
  eventId: unknown
  channel: unknown
  status: unknown
  destination: unknown
  recipientUserId: unknown
  title?: unknown
  attemptCount: unknown
  availableAt: unknown
  processingStartedAt: unknown
}

function asChannel(value: unknown): NotificationChannel | null {
  return notificationChannels.includes(value as NotificationChannel)
    ? (value as NotificationChannel)
    : null
}

function asEventType(value: unknown): NotificationType | null {
  return notificationTypes.includes(value as NotificationType)
    ? (value as NotificationType)
    : null
}

function logDelivery(meta: Record<string, unknown>) {
  console.info("[notifications.delivery]", meta)
}

async function reclaimStuckDeliveries(orm: PublicOrm) {
  const processing = await orm.public.NotificationDelivery.where({ status: "PROCESSING" }).all()
  let reclaimed = 0

  for (const row of processing) {
    if (!isLeaseExpired(row.processingStartedAt, NOTIFICATION_PROCESSING_LEASE_SECONDS)) {
      continue
    }

    const updated = await orm.public.NotificationDelivery.where({
      id: row.id,
      organizationId: row.organizationId,
      status: "PROCESSING",
    }).update({
      status: "PENDING",
      processingStartedAt: null,
      availableAt: Temporal.Now.instant(),
    })

    if (updated) {
      reclaimed += 1
    }
  }

  return reclaimed
}

async function reclaimStuckOutbox(orm: PublicOrm) {
  const processing = await orm.public.NotificationOutbox.where({ status: "PROCESSING" }).all()
  let reclaimed = 0

  for (const row of processing) {
    if (!isLeaseExpired(row.processingStartedAt, NOTIFICATION_PROCESSING_LEASE_SECONDS)) {
      continue
    }

    const updated = await orm.public.NotificationOutbox.where({
      id: row.id,
      organizationId: row.organizationId,
      status: "PROCESSING",
    }).update({
      status: "PENDING",
      processingStartedAt: null,
      availableAt: Temporal.Now.instant(),
    })

    if (updated) {
      reclaimed += 1
    }
  }

  return reclaimed
}

async function processPendingOutbox(orm: PublicOrm, limit: number) {
  const pending = await orm.public.NotificationOutbox.where({ status: "PENDING" }).all()
  const due = pending
    .filter((row) => isAvailable(row.availableAt))
    .sort((a, b) => instantMs(a.availableAt) - instantMs(b.availableAt))
    .slice(0, limit)

  let processed = 0

  for (const row of due) {
    const eventType = asEventType(row.eventType)
    if (!eventType) {
      continue
    }

    await processOutboxEvent(
      {
        organizationId: String(row.organizationId),
        eventType,
        eventId: String(row.eventId),
      },
      orm,
    )
    processed += 1
  }

  return processed
}

async function sendClaimedDelivery(orm: PublicOrm, claimed: DeliveryRow) {
  const id = String(claimed.id)
  const organizationId = String(claimed.organizationId)
  const recipientUserId = String(claimed.recipientUserId)
  const eventId = String(claimed.eventId)
  const channel = asChannel(claimed.channel)
  const eventType = asEventType(claimed.eventType)

  if (!channel || channel === "IN_APP" || !eventType) {
    await orm.public.NotificationDelivery.where({
      id,
      organizationId,
    }).update({
      status: "CANCELLED",
      processingStartedAt: null,
      failedAt: Temporal.Now.instant(),
      lastError: adminSafeDeliveryError("INVALID_TEMPLATE"),
    })
    return { status: "CANCELLED" as const }
  }

  const destination = claimed.destination == null ? "" : String(claimed.destination)
  if (!destination) {
    await orm.public.NotificationDelivery.where({
      id,
      organizationId,
    }).update({
      status: "CANCELLED",
      processingStartedAt: null,
      failedAt: Temporal.Now.instant(),
      lastError: adminSafeDeliveryError("INVALID_DESTINATION"),
    })
    return { status: "CANCELLED" as const }
  }

  const provider = getProviderForChannel(channel)
  if (!provider?.isConfigured()) {
    await orm.public.NotificationDelivery.where({
      id,
      organizationId,
    }).update({
      status: "CANCELLED",
      processingStartedAt: null,
      failedAt: Temporal.Now.instant(),
      lastError: adminSafeDeliveryError("CONFIGURATION"),
    })
    return { status: "CANCELLED" as const }
  }

  const notification = await orm.public.Notification.where({
    organizationId,
    recipientUserId,
    type: eventType,
    eventId,
  }).first()

  const content = renderChannelContent(
    {
      organizationId,
      eventId,
      type: eventType,
      recipientUserId,
      title: notification ? String(notification.title) : eventType,
      body: notification ? String(notification.body) : "You have a new notification.",
    },
    channel,
  )

  const attempt = Number(claimed.attemptCount ?? 0) + 1

  try {
    const result = await provider.send({
      deliveryId: id,
      organizationId,
      eventType,
      templateKey: content.templateKey,
      destination,
      subject: content.subject,
      text: content.text,
      html: content.html,
    })

    await orm.public.NotificationDelivery.where({
      id,
      organizationId,
    }).update({
      status: "SENT",
      attemptCount: attempt,
      processingStartedAt: null,
      sentAt: Temporal.Now.instant(),
      lastError: null,
      providerMessageId: result.providerMessageId,
      templateKey: content.templateKey,
    })

    logDelivery({
      deliveryId: id,
      eventType,
      channel,
      provider: provider.provider,
      attempt,
      status: "SENT",
      providerMessageId: result.providerMessageId,
      destination: maskDestination(channel, destination),
    })

    return { status: "SENT" as const }
  } catch (error) {
    const classified = sanitizedDeliveryError(error)
    const adminReason = adminSafeDeliveryError(
      "code" in (error as object) ? String((error as { code?: unknown }).code) : "REJECTED",
    )
    const failed = !classified.retryable || attempt >= NOTIFICATION_DELIVERY_MAX_ATTEMPTS

    await orm.public.NotificationDelivery.where({
      id,
      organizationId,
    }).update({
      status: failed ? "FAILED" : "PENDING",
      attemptCount: attempt,
      processingStartedAt: null,
      failedAt: failed ? Temporal.Now.instant() : null,
      lastError: adminReason,
      availableAt: Temporal.Now.instant().add({
        seconds: failed ? 0 : deliveryBackoffSeconds(attempt),
      }),
    })

    logDelivery({
      deliveryId: id,
      eventType,
      channel,
      provider: provider.provider,
      attempt,
      status: failed ? "FAILED" : "PENDING",
    })

    return { status: failed ? ("FAILED" as const) : ("PENDING" as const) }
  }
}

export async function processNotificationDeliveries(
  options: { limit?: number; orm?: PublicOrm } = {},
) {
  const orm = options.orm ?? db.orm
  const limit = options.limit ?? NOTIFICATION_WORKER_BATCH_SIZE
  const pending = await orm.public.NotificationDelivery.where({ status: "PENDING" }).all()
  const due = pending
    .filter((row) => {
      const channel = asChannel(row.channel)
      return channel !== "IN_APP" && isAvailable(row.availableAt)
    })
    .sort((a, b) => instantMs(a.availableAt) - instantMs(b.availableAt))
    .slice(0, limit)

  const results = { claimed: 0, sent: 0, failed: 0, cancelled: 0, retried: 0 }

  for (const row of due) {
    const claimed = await orm.public.NotificationDelivery.where({
      id: String(row.id),
      organizationId: String(row.organizationId),
      status: "PENDING",
    }).update({
      status: "PROCESSING",
      processingStartedAt: Temporal.Now.instant(),
    })

    if (!claimed) {
      continue
    }

    results.claimed += 1

    try {
      const outcome = await sendClaimedDelivery(orm, claimed as DeliveryRow)
      if (outcome.status === "SENT") {
        results.sent += 1
      } else if (outcome.status === "FAILED") {
        results.failed += 1
      } else if (outcome.status === "CANCELLED") {
        results.cancelled += 1
      } else {
        results.retried += 1
      }
    } catch {
      results.failed += 1
      await orm.public.NotificationDelivery.where({
        id: String(claimed.id),
        organizationId: String(claimed.organizationId),
      }).update({
        status: "PENDING",
        processingStartedAt: null,
        availableAt: Temporal.Now.instant().add({ seconds: deliveryBackoffSeconds(1) }),
        lastError: adminSafeDeliveryError("PROVIDER_UNAVAILABLE"),
      })
    }
  }

  return results
}

export async function drainNotificationWork(
  options: { limit?: number; orm?: PublicOrm } = {},
) {
  const orm = options.orm ?? db.orm
  const limit = options.limit ?? NOTIFICATION_WORKER_BATCH_SIZE
  const reclaimedOutbox = await reclaimStuckOutbox(orm)
  const reclaimedDeliveries = await reclaimStuckDeliveries(orm)
  const outboxProcessed = await processPendingOutbox(orm, limit)
  const deliveries = await processNotificationDeliveries({ limit, orm })

  return {
    reclaimedOutbox,
    reclaimedDeliveries,
    outboxProcessed,
    deliveries,
  }
}
