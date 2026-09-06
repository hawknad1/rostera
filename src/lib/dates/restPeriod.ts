import { Temporal } from "temporal-polyfill"

import { instantDurationMinutes } from "@/lib/dates/workingHours"

export function restMinutesBetween(previousEnd: Temporal.Instant, nextStart: Temporal.Instant) {
  return instantDurationMinutes(previousEnd, nextStart)
}
