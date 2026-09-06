import type { NotificationChannel } from "@/modules/notifications/types/notification"

export function maskDestination(
  channel: NotificationChannel | string,
  destination: string | null | undefined,
): string {
  if (!destination) {
    return "—"
  }

  if (channel === "EMAIL") {
    const [local, domain] = destination.split("@")
    if (!local || !domain) {
      return "***"
    }

    const visible = local.slice(0, 1)
    return `${visible}***@${domain}`
  }

  if (channel === "SMS" || channel === "WHATSAPP") {
    if (destination.length < 8) {
      return "••••"
    }

    return `${destination.slice(0, 4)}••••••${destination.slice(-4)}`
  }

  return "in-app"
}
