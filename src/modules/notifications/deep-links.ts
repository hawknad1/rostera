import type { NotificationEntityType } from "@/modules/notifications/types/notification"

export function notificationHref(
  entityType: NotificationEntityType | null | undefined,
  entityId: string | null | undefined,
) {
  if (!entityType || !entityId) {
    return "/notifications"
  }

  switch (entityType) {
    case "LEAVE_REQUEST":
      return `/leave/${entityId}`
    case "SHIFT_SWAP":
      return `/shift-swaps/${entityId}`
    case "ROSTER":
      return `/rosters/${entityId}`
  }
}

export function entityTypeForNotification(
  type: string,
): NotificationEntityType | undefined {
  if (type.startsWith("LEAVE_")) {
    return "LEAVE_REQUEST"
  }

  if (type.startsWith("SHIFT_SWAP_")) {
    return "SHIFT_SWAP"
  }

  if (type.startsWith("ROSTER_")) {
    return "ROSTER"
  }

  return undefined
}
