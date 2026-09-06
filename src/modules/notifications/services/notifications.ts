import { Temporal } from "temporal-polyfill"

import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { notificationError } from "@/modules/notifications/errors"
import {
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_PREVIEW_SIZE,
  notificationEntityTypes,
  notificationTypes,
  type NotificationEntityType,
  type NotificationType,
} from "@/modules/notifications/types/notification"
import { db } from "@/prisma/db"

export type NotificationRecord = {
  id: string
  organizationId: string
  recipientUserId: string
  type: NotificationType
  title: string
  body: string
  entityType: NotificationEntityType | null
  entityId: string | null
  eventId: string
  readAt: unknown
  createdAt: unknown
}

function asNotificationType(value: unknown): NotificationType {
  if (notificationTypes.includes(value as NotificationType)) {
    return value as NotificationType
  }

  return notificationTypes[0]
}

function asEntityType(value: unknown): NotificationEntityType | null {
  if (notificationEntityTypes.includes(value as NotificationEntityType)) {
    return value as NotificationEntityType
  }

  return null
}

function createdAtMs(value: unknown) {
  if (!value) {
    return 0
  }

  if (typeof value === "object" && value !== null && "epochMilliseconds" in value) {
    return Number((value as { epochMilliseconds: number }).epochMilliseconds)
  }

  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? 0 : parsed
}

function isUnread(readAt: unknown) {
  return readAt == null
}

function toRecord(row: {
  id: unknown
  organizationId: unknown
  recipientUserId: unknown
  type: unknown
  title: unknown
  body: unknown
  entityType?: unknown
  entityId?: unknown
  eventId: unknown
  readAt?: unknown
  createdAt?: unknown
}): NotificationRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    recipientUserId: String(row.recipientUserId),
    type: asNotificationType(row.type),
    title: String(row.title),
    body: String(row.body),
    entityType: asEntityType(row.entityType),
    entityId: row.entityId == null ? null : String(row.entityId),
    eventId: String(row.eventId),
    readAt: row.readAt ?? null,
    createdAt: row.createdAt ?? null,
  }
}

async function requireNotificationMembership() {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw notificationError("UNAUTHENTICATED")
  }

  return membership
}

async function loadRecipientNotifications(organizationId: string, recipientUserId: string) {
  const rows = await db.orm.public.Notification.where({
    organizationId,
    recipientUserId,
  }).all()

  return rows
    .map(toRecord)
    .sort((left, right) => createdAtMs(right.createdAt) - createdAtMs(left.createdAt))
}

export async function listNotifications(page = 1) {
  const membership = await requireNotificationMembership()
  const all = await loadRecipientNotifications(membership.organizationId, membership.userId)
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const start = (safePage - 1) * NOTIFICATION_PAGE_SIZE
  const items = all.slice(start, start + NOTIFICATION_PAGE_SIZE)

  return {
    items,
    page: safePage,
    pageSize: NOTIFICATION_PAGE_SIZE,
    total: all.length,
    unreadCount: all.filter((row) => isUnread(row.readAt)).length,
    hasPrevious: safePage > 1,
    hasNext: start + NOTIFICATION_PAGE_SIZE < all.length,
  }
}

export async function getNotificationCenterPreview() {
  const membership = await getCurrentMembership()

  if (!membership) {
    return { unreadCount: 0, recent: [] as NotificationRecord[] }
  }

  const all = await loadRecipientNotifications(membership.organizationId, membership.userId)

  return {
    unreadCount: all.filter((row) => isUnread(row.readAt)).length,
    recent: all.slice(0, NOTIFICATION_PREVIEW_SIZE),
  }
}

export async function getUnreadNotificationCount() {
  const preview = await getNotificationCenterPreview()
  return preview.unreadCount
}

export async function markNotificationRead(notificationId: string) {
  const membership = await requireNotificationMembership()
  const updated = await db.orm.public.Notification.where({
    id: notificationId,
    organizationId: membership.organizationId,
    recipientUserId: membership.userId,
  }).update({
    readAt: Temporal.Now.instant(),
  })

  if (!updated) {
    throw notificationError("NOTIFICATION_NOT_FOUND")
  }

  return toRecord(updated)
}

export async function markNotificationUnread(notificationId: string) {
  const membership = await requireNotificationMembership()
  const updated = await db.orm.public.Notification.where({
    id: notificationId,
    organizationId: membership.organizationId,
    recipientUserId: membership.userId,
  }).update({
    readAt: null,
  })

  if (!updated) {
    throw notificationError("NOTIFICATION_NOT_FOUND")
  }

  return toRecord(updated)
}

export async function markAllNotificationsRead() {
  const membership = await requireNotificationMembership()
  const rows = await loadRecipientNotifications(membership.organizationId, membership.userId)
  const unread = rows.filter((row) => isUnread(row.readAt))
  const readAt = Temporal.Now.instant()

  for (const row of unread) {
    await db.orm.public.Notification.where({
      id: row.id,
      organizationId: membership.organizationId,
      recipientUserId: membership.userId,
    }).update({ readAt })
  }

  return { updated: unread.length }
}
