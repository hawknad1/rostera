import { Temporal } from "temporal-polyfill"

export function instantToIso(value: unknown): string | null {
  if (value == null) {
    return null
  }

  try {
    return Temporal.Instant.from(String(value)).toString()
  } catch {
    return String(value)
  }
}

export function asInstant(value: unknown): Temporal.Instant | null {
  if (value == null) {
    return null
  }

  try {
    return Temporal.Instant.from(String(value))
  } catch {
    return null
  }
}

export function formatInstantTime(value: unknown, timeZone: string) {
  const instant = asInstant(value)
  if (!instant) {
    return null
  }

  const zoned = instant.toZonedDateTimeISO(timeZone)
  return `${String(zoned.hour).padStart(2, "0")}:${String(zoned.minute).padStart(2, "0")}`
}

export function formatInstantDateTime(value: unknown, timeZone: string) {
  const instant = asInstant(value)
  if (!instant) {
    return null
  }

  return instant.toZonedDateTimeISO(timeZone).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function formatMinutes(minutes: number | null | undefined) {
  if (minutes == null) {
    return "—"
  }

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  if (hours === 0) {
    return `${remainder}m`
  }

  if (remainder === 0) {
    return `${hours}h`
  }

  return `${hours}h ${String(remainder).padStart(2, "0")}m`
}

export function datetimeLocalValue(value: unknown, timeZone: string) {
  const instant = asInstant(value)
  if (!instant) {
    return ""
  }

  const zoned = instant.toZonedDateTimeISO(timeZone)
  const date = zoned.toPlainDate().toString()
  const time = `${String(zoned.hour).padStart(2, "0")}:${String(zoned.minute).padStart(2, "0")}`
  return `${date}T${time}`
}

export function parseDatetimeLocal(value: string, timeZone: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value.trim())
  if (!match) {
    throw new Error("Enter a valid date and time.")
  }

  const [year, month, day] = match[1].split("-").map(Number)
  return Temporal.ZonedDateTime.from(
    {
      timeZone,
      year,
      month,
      day,
      hour: Number(match[2]),
      minute: Number(match[3]),
    },
    { overflow: "reject" },
  ).toInstant()
}
