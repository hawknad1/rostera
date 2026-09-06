const SENSITIVE_KEY_PATTERN =
  /^(password|passwd|pwd|token|secret|authorization|cookie|otp|refreshToken|accessToken|idToken|apiKey|apikey|session|sessionToken|privateKey|credential|credentials)$/i

export function isSensitiveAuditKey(key: string) {
  return SENSITIVE_KEY_PATTERN.test(key.trim())
}

export function sanitizeAuditMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeAuditMetadata(entry))
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {}

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isSensitiveAuditKey(key) ? "[redacted]" : sanitizeAuditMetadata(entry)
    }

    return result
  }

  return value
}

export function serializeAuditMetadata(value: unknown) {
  if (value == null) {
    return null
  }

  return JSON.stringify(sanitizeAuditMetadata(value))
}

export function parseAuditMetadata(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string" || raw.length === 0) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null
    }

    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

export function auditChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: readonly string[],
) {
  const changedFields = keys.filter((key) => before[key] !== after[key])

  const pick = (source: Record<string, unknown>) => {
    const result: Record<string, unknown> = {}
    for (const key of changedFields) {
      result[key] = source[key] ?? null
    }
    return result
  }

  return {
    changedFields,
    before: pick(before),
    after: pick(after),
  }
}

export function oneShotAuditEventId(action: string, entityId: string) {
  return `${action}:${entityId}`
}

export function repeatableAuditEventId(action: string, entityId: string) {
  return `${action}:${entityId}:${crypto.randomUUID()}`
}
