export const notificationErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOTIFICATION_NOT_FOUND",
  "PREFERENCE_LOCKED",
  "FAILED",
] as const

export type NotificationErrorCode = (typeof notificationErrorCodes)[number]

export class NotificationError extends Error {
  readonly code: NotificationErrorCode

  constructor(code: NotificationErrorCode, message: string) {
    super(message)
    this.name = "NotificationError"
    this.code = code
  }
}

export function isNotificationError(error: unknown): error is NotificationError {
  return error instanceof NotificationError
}

export const notificationErrorMessages: Record<NotificationErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in to view notifications.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOTIFICATION_NOT_FOUND: "Notification not found.",
  PREFERENCE_LOCKED: "This notification channel cannot be turned off.",
  FAILED: "Unable to update this notification. Please try again.",
}

export function notificationError(code: NotificationErrorCode) {
  return new NotificationError(code, notificationErrorMessages[code])
}
