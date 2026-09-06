export function instantMs(value: unknown) {
  if (!value) {
    return 0
  }

  if (typeof value === "object" && value !== null && "epochMilliseconds" in value) {
    return Number((value as { epochMilliseconds: number }).epochMilliseconds)
  }

  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? 0 : parsed
}

export function isAvailable(value: unknown, nowMs = Date.now()) {
  return instantMs(value) <= nowMs
}

export function isLeaseExpired(startedAt: unknown, leaseSeconds: number, nowMs = Date.now()) {
  if (!startedAt) {
    return true
  }

  return nowMs - instantMs(startedAt) >= leaseSeconds * 1000
}

export function deliveryBackoffSeconds(attempts: number) {
  return Math.min(30 * 2 ** Math.max(attempts - 1, 0), 600)
}
