const EXCLUSION_VIOLATION_SQLSTATE = "23P01"

export function isExclusionConstraintViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }

  if (!Object.hasOwn(error, "kind")) {
    return false
  }

  const candidate = error as { kind: unknown; sqlState?: unknown }
  return candidate.kind === "sql_query" && candidate.sqlState === EXCLUSION_VIOLATION_SQLSTATE
}
