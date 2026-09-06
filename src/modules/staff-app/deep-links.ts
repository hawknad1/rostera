import type { NotificationEntityType } from "@/modules/notifications/types/notification"

export function staffNotificationHref(
  entityType: NotificationEntityType | null | undefined,
  entityId: string | null | undefined,
) {
  if (!entityType || !entityId) {
    return "/me/notifications"
  }

  switch (entityType) {
    case "LEAVE_REQUEST":
      return `/me/leave/${entityId}`
    case "SHIFT_SWAP":
      return `/me/swaps/${entityId}`
    case "ROSTER":
      return "/me/roster"
    case "ATTENDANCE":
      return "/me/attendance"
  }
}
