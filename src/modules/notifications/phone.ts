const E164_PATTERN = /^\+[1-9]\d{7,14}$/

export function normalizeE164(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  let digits = value.trim().replace(/[\s\-().]/g, "")

  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`
  }

  if (!digits.startsWith("+")) {
    return null
  }

  if (!E164_PATTERN.test(digits)) {
    return null
  }

  return digits
}

export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) {
    return false
  }

  const trimmed = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export function normalizeEmail(value: string | null | undefined): string | null {
  if (!isValidEmail(value)) {
    return null
  }

  return String(value).trim().toLowerCase()
}
