export const notificationTypes = [
  "LEAVE_REQUESTED",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "LEAVE_CANCELLED",
  "SHIFT_SWAP_REQUESTED",
  "SHIFT_SWAP_COMPLETED",
  "SHIFT_SWAP_REJECTED",
  "SHIFT_SWAP_CANCELLED",
  "ROSTER_SUBMITTED_FOR_REVIEW",
  "ROSTER_PUBLISHED",
  "ROSTER_RETURNED_TO_DRAFT",
  "ROSTER_AMENDMENT_CREATED",
  "ATTENDANCE_CORRECTED",
  "ATTENDANCE_APPROVED",
  "ATTENDANCE_REJECTED",
] as const

export type NotificationType = (typeof notificationTypes)[number]

export const notificationEntityTypes = ["LEAVE_REQUEST", "SHIFT_SWAP", "ROSTER", "ATTENDANCE"] as const

export type NotificationEntityType = (typeof notificationEntityTypes)[number]

export const notificationOutboxStatuses = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const

export type NotificationOutboxStatus = (typeof notificationOutboxStatuses)[number]

export const notificationChannels = ["IN_APP", "EMAIL", "SMS", "WHATSAPP"] as const

export type NotificationChannel = (typeof notificationChannels)[number]

export const notificationDeliveryStatuses = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const

export type NotificationDeliveryStatus = (typeof notificationDeliveryStatuses)[number]

export const notificationDeliveryProviders = [
  "IN_APP",
  "RESEND",
  "TWILIO_SMS",
  "TWILIO_WHATSAPP",
] as const

export type NotificationDeliveryProvider = (typeof notificationDeliveryProviders)[number]

export const notificationPriorities = ["operational", "optional"] as const

export type NotificationPriority = (typeof notificationPriorities)[number]

export type NotificationIntent = {
  organizationId: string
  eventId: string
  type: NotificationType
  recipientUserId: string
  entityType?: NotificationEntityType
  entityId?: string
  title: string
  body: string
}

export type OutboxPayload = {
  actorUserId: string
  intents: NotificationIntent[]
}

export type DomainNotificationEvent =
  | {
      type: "LEAVE_REQUESTED" | "LEAVE_APPROVED" | "LEAVE_REJECTED" | "LEAVE_CANCELLED"
      organizationId: string
      eventId: string
      actorUserId: string
      staffId: string
      staffName: string
      leaveTypeLabel: string
      startDate: string
      endDate: string
    }
  | {
      type: "SHIFT_SWAP_REQUESTED" | "SHIFT_SWAP_REJECTED" | "SHIFT_SWAP_CANCELLED"
      organizationId: string
      eventId: string
      actorUserId: string
      requesterStaffId: string
      targetStaffId: string
      requesterName: string
    }
  | {
      type: "SHIFT_SWAP_COMPLETED"
      organizationId: string
      eventId: string
      actorUserId: string
      requesterStaffId: string
      targetStaffId: string
    }
  | {
      type: "ROSTER_SUBMITTED_FOR_REVIEW" | "ROSTER_RETURNED_TO_DRAFT" | "ROSTER_AMENDMENT_CREATED"
      organizationId: string
      eventId: string
      actorUserId: string
      rosterId: string
      departmentId: string
      createdByUserId: string
      rosterName: string
      versionNumber?: number
      sourceVersion?: number
      reason?: string
    }
  | {
      type: "ROSTER_PUBLISHED"
      organizationId: string
      eventId: string
      actorUserId: string
      rosterId: string
      startDate: string
      endDate: string
    }
  | {
      type: "ATTENDANCE_CORRECTED" | "ATTENDANCE_APPROVED" | "ATTENDANCE_REJECTED"
      organizationId: string
      eventId: string
      actorUserId: string
      staffId: string
    }

export const NOTIFICATION_PAGE_SIZE = 25
export const NOTIFICATION_PREVIEW_SIZE = 8
export const NOTIFICATION_MAX_ATTEMPTS = 5
export const NOTIFICATION_DELIVERY_MAX_ATTEMPTS = 5
export const NOTIFICATION_PROCESSING_LEASE_SECONDS = 120
export const NOTIFICATION_WORKER_BATCH_SIZE = 25
export const NOTIFICATION_DELIVERY_PAGE_SIZE = 25
