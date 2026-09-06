import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { hasPermission } from "@/lib/auth/has-permission"
import { permissions } from "@/lib/permissions/permissions"
import { maskDestination } from "@/modules/notifications/mask"
import { notificationError } from "@/modules/notifications/errors"
import { instantMs } from "@/modules/notifications/services/time"
import {
  NOTIFICATION_DELIVERY_PAGE_SIZE,
  notificationChannels,
  notificationDeliveryStatuses,
  type NotificationChannel,
  type NotificationDeliveryStatus,
  type NotificationType,
} from "@/modules/notifications/types/notification"
import { db } from "@/prisma/db"

export type DeliveryHistoryRecord = {
  id: string
  organizationId: string
  eventType: NotificationType
  eventId: string
  recipientUserId: string
  recipientLabel: string
  channel: NotificationChannel
  provider: string
  status: NotificationDeliveryStatus
  destination: string
  attemptCount: number
  createdAt: unknown
  sentAt: unknown
  deliveredAt: unknown
  failedAt: unknown
  lastError: string | null
  providerMessageId: string | null
}

export type DeliveryListFilters = {
  page?: number
  status?: NotificationDeliveryStatus
  channel?: NotificationChannel
}

function asStatus(value: unknown): NotificationDeliveryStatus {
  return notificationDeliveryStatuses.includes(value as NotificationDeliveryStatus)
    ? (value as NotificationDeliveryStatus)
    : "PENDING"
}

function asChannel(value: unknown): NotificationChannel {
  return notificationChannels.includes(value as NotificationChannel)
    ? (value as NotificationChannel)
    : "IN_APP"
}

async function requireDeliveryViewer() {
  const membership = await getCurrentMembership()
  if (!membership) {
    throw notificationError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permissions.notificationsView)
  if (!authorized) {
    throw notificationError("FORBIDDEN")
  }

  return membership
}

export async function listNotificationDeliveries(filters: DeliveryListFilters = {}) {
  const membership = await requireDeliveryViewer()
  const page = Math.max(filters.page ?? 1, 1)
  const rows = await db.orm.public.NotificationDelivery.where({
    organizationId: membership.organizationId,
  }).all()

  const filtered = rows.filter((row) => {
    if (filters.status && String(row.status) !== filters.status) {
      return false
    }
    if (filters.channel && String(row.channel) !== filters.channel) {
      return false
    }
    return true
  })

  filtered.sort((a, b) => instantMs(b.createdAt) - instantMs(a.createdAt))

  const start = (page - 1) * NOTIFICATION_DELIVERY_PAGE_SIZE
  const slice = filtered.slice(start, start + NOTIFICATION_DELIVERY_PAGE_SIZE)
  const items: DeliveryHistoryRecord[] = []

  for (const row of slice) {
    const user = await db.orm.public.User.where({ id: row.recipientUserId }).first()
    const channel = asChannel(row.channel)
    items.push({
      id: String(row.id),
      organizationId: String(row.organizationId),
      eventType: row.eventType as NotificationType,
      eventId: String(row.eventId),
      recipientUserId: String(row.recipientUserId),
      recipientLabel: user?.email ? String(user.email) : String(row.recipientUserId),
      channel,
      provider: String(row.provider),
      status: asStatus(row.status),
      destination: maskDestination(channel, row.destination == null ? null : String(row.destination)),
      attemptCount: Number(row.attemptCount ?? 0),
      createdAt: row.createdAt,
      sentAt: row.sentAt,
      deliveredAt: row.deliveredAt,
      failedAt: row.failedAt,
      lastError: row.lastError == null ? null : String(row.lastError),
      providerMessageId: row.providerMessageId == null ? null : String(row.providerMessageId),
    })
  }

  return {
    items,
    page,
    hasPrevious: page > 1,
    hasNext: start + NOTIFICATION_DELIVERY_PAGE_SIZE < filtered.length,
    total: filtered.length,
  }
}

export async function getNotificationDeliveryCounts() {
  const membership = await requireDeliveryViewer()
  const rows = await db.orm.public.NotificationDelivery.where({
    organizationId: membership.organizationId,
  }).all()

  const counts = {
    pending: 0,
    processing: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    cancelled: 0,
    retry: 0,
  }

  for (const row of rows) {
    const status = String(row.status)
    if (status === "PENDING") {
      counts.pending += 1
      if (Number(row.attemptCount ?? 0) > 0) {
        counts.retry += 1
      }
    } else if (status === "PROCESSING") {
      counts.processing += 1
    } else if (status === "SENT") {
      counts.sent += 1
    } else if (status === "DELIVERED") {
      counts.delivered += 1
    } else if (status === "FAILED") {
      counts.failed += 1
    } else if (status === "CANCELLED") {
      counts.cancelled += 1
    }
  }

  return counts
}
