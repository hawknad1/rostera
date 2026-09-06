import { Temporal } from "temporal-polyfill"

export function formatNotificationTimestamp(value: unknown, timeZone: string) {
  if (!value) {
    return ""
  }

  try {
    const instant = Temporal.Instant.from(String(value))
    return instant.toZonedDateTimeISO(timeZone).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    const raw = String(value)
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
    if (match) {
      return `${match[1]} ${match[2]}`
    }
    return ""
  }
}
