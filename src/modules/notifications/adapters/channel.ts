export type DeliveryResult = {
  delivered: boolean
  skipped: boolean
}

export interface NotificationChannel {
  deliver(
    notification: import("@/modules/notifications/types/notification").NotificationIntent,
  ): Promise<DeliveryResult>
}

export type EmailNotificationChannel = NotificationChannel
export type SmsNotificationChannel = NotificationChannel
export type WhatsAppNotificationChannel = NotificationChannel
