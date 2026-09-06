import { z } from "zod"

import {
  notificationEntityTypes,
  notificationTypes,
  type NotificationIntent,
} from "@/modules/notifications/types/notification"

export const notificationTypeSchema = z.enum(notificationTypes)
export const notificationEntityTypeSchema = z.enum(notificationEntityTypes)

export const notificationIdInputSchema = z.object({
  id: z.string().trim().min(1, "Notification is required."),
})

export const notificationIntentSchema = z.object({
  organizationId: z.string().trim().min(1),
  eventId: z.string().trim().min(1),
  type: notificationTypeSchema,
  recipientUserId: z.string().trim().min(1),
  entityType: notificationEntityTypeSchema.optional(),
  entityId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
})

export function parseNotificationIntent(value: unknown): NotificationIntent {
  return notificationIntentSchema.parse(value)
}

export const notificationPreferenceInputSchema = z.object({
  eventType: notificationTypeSchema,
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  enabled: z.enum(["true", "false"]),
})
