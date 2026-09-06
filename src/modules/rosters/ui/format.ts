import { formatDisplayDate } from "@/lib/dates/calendar-date"

export function formatRosterInstantDate(value: unknown) {
  const raw = String(value ?? "")
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (!match) {
    return raw || "—"
  }

  try {
    return formatDisplayDate(match[1])
  } catch {
    return match[1]
  }
}
