import { Temporal } from "temporal-polyfill"

export function instantDurationMinutes(start: Temporal.Instant, end: Temporal.Instant) {
  return Math.trunc(Number(end.epochMilliseconds - start.epochMilliseconds) / 60_000)
}
