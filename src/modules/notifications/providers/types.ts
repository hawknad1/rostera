import type {
  NotificationChannel,
  NotificationDeliveryProvider,
} from "@/modules/notifications/types/notification"

export type ChannelSendInput = {
  deliveryId: string
  organizationId: string
  eventType: string
  templateKey: string
  destination: string
  subject?: string
  text: string
  html?: string
}

export type ChannelSendResult = {
  providerMessageId: string
}

export interface NotificationChannelProvider {
  readonly channel: Exclude<NotificationChannel, "IN_APP">
  readonly provider: Exclude<NotificationDeliveryProvider, "IN_APP">
  isConfigured(): boolean
  send(input: ChannelSendInput): Promise<ChannelSendResult>
}

export type DeliveryStatusEvent = {
  provider: NotificationDeliveryProvider
  providerMessageId: string
  providerEventId: string
  status: "SENT" | "DELIVERED" | "FAILED"
  error?: string
}
