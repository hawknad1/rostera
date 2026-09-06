import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import type { NotificationChannel, DeliveryResult } from "@/modules/notifications/adapters/channel"
import { parseNotificationIntent } from "@/modules/notifications/schemas/notification"
import type { NotificationIntent } from "@/modules/notifications/types/notification"
import type { PublicOrm } from "@/modules/notifications/types/orm"

export class InAppNotificationChannel implements NotificationChannel {
  constructor(private readonly orm: PublicOrm) {}

  async deliver(notification: NotificationIntent): Promise<DeliveryResult> {
    const intent = parseNotificationIntent(notification)

    try {
      await this.orm.public.Notification.create({
        organizationId: intent.organizationId,
        recipientUserId: intent.recipientUserId,
        type: intent.type,
        title: intent.title,
        body: intent.body,
        eventId: intent.eventId,
        readAt: null,
        ...(intent.entityType ? { entityType: intent.entityType } : {}),
        ...(intent.entityId ? { entityId: intent.entityId } : {}),
      })
      return { delivered: true, skipped: false }
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return { delivered: false, skipped: true }
      }

      throw error
    }
  }
}

export function inAppChannel(orm: PublicOrm) {
  return new InAppNotificationChannel(orm)
}
