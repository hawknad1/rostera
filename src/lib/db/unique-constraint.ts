const UNIQUE_VIOLATION_SQLSTATE = "23505"

export function isUniqueConstraintViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }

  if (!Object.hasOwn(error, "kind")) {
    return false
  }

  const candidate = error as { kind: unknown; sqlState?: unknown }
  return candidate.kind === "sql_query" && candidate.sqlState === UNIQUE_VIOLATION_SQLSTATE
}

export function isOrganizationSlugUniqueViolation(error: unknown): boolean {
  if (!isUniqueConstraintViolation(error)) {
    return false
  }

  const candidate = error as {
    table?: unknown
    column?: unknown
    constraint?: unknown
  }

  const table = typeof candidate.table === "string" ? candidate.table.toLowerCase() : ""
  const column = typeof candidate.column === "string" ? candidate.column.toLowerCase() : ""
  const constraint =
    typeof candidate.constraint === "string" ? candidate.constraint.toLowerCase() : ""

  return table === "organization" || column === "slug" || constraint.includes("slug")
}
