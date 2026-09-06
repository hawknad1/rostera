const PROTOCOL_RELATIVE = /^\/\//
const BACKSLASH = /\\/
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed.startsWith("/") || PROTOCOL_RELATIVE.test(trimmed) || BACKSLASH.test(trimmed)) {
    return null
  }

  if (CONTROL_CHARS.test(trimmed) || trimmed.includes("@")) {
    return null
  }

  try {
    const parsed = new URL(trimmed, "https://rostera.local")
    if (parsed.origin !== "https://rostera.local" || parsed.username || parsed.password) {
      return null
    }

    return `${parsed.pathname}${parsed.search}`
  } catch {
    return null
  }
}
