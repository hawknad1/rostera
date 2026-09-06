export const conflictSeverities = ["INFO", "WARNING", "ERROR", "CRITICAL"] as const

export type ConflictSeverity = (typeof conflictSeverities)[number]

export const constraintKinds = ["HARD", "SOFT"] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export const schedulingConflictCodes = [
  "ASSIGNMENT_OVERLAP",
  "LEAVE_CONFLICT",
  "INSUFFICIENT_REST",
  "MAXIMUM_HOURS_EXCEEDED",
  "CONSECUTIVE_SHIFT_LIMIT",
  "QUALIFICATION_MISMATCH",
  "STAFFING_SHORTFALL",
  "STAFFING_OVERSTAFFED",
  "NIGHT_SHIFT_LIMIT",
  "WEEKEND_LIMIT",
] as const

export type SchedulingConflictCode = (typeof schedulingConflictCodes)[number]

export type SchedulingConflict = {
  code: SchedulingConflictCode
  severity: ConflictSeverity
  blocking: boolean
  rule: string
  message: string
  staffId?: string
  assignmentId?: string
  date?: string
  relatedAssignmentId?: string
  metadata?: Record<string, unknown>
}

export type SchedulingResult = {
  valid: boolean
  conflicts: SchedulingConflict[]
}

export function isBlockingConstraint(constraint: ConstraintKind, severity: ConflictSeverity) {
  if (constraint === "SOFT") {
    return false
  }

  return severity === "ERROR" || severity === "CRITICAL"
}

export function schedulingConflict(input: SchedulingConflict): SchedulingConflict {
  return {
    ...input,
    metadata: input.metadata,
  }
}
