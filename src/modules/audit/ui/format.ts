import { Temporal } from "temporal-polyfill"

export function formatAuditTimestamp(value: unknown, timeZone: string) {
  if (!value) {
    return ""
  }

  try {
    const instant = Temporal.Instant.from(String(value))
    return instant.toZonedDateTimeISO(timeZone).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    const raw = String(value)
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
    if (match) {
      return `${match[1]} ${match[2]}`
    }
    return raw
  }
}

export function formatAuditValue(value: unknown): string {
  if (value == null) {
    return "—"
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (typeof value === "number") {
    return String(value)
  }

  if (typeof value === "string") {
    return value.length === 0 ? "—" : value
  }

  return JSON.stringify(value)
}
