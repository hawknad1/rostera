import type { RosterValidationResult } from "@/modules/rosters/types/validation"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"

export type SerializedSchedulingConflict = {
  code: string
  severity: string
  blocking: boolean
  rule: string
  message: string
  staffId?: string
  assignmentId?: string
  date?: string
  relatedAssignmentId?: string
  metadata?: Record<string, unknown>
}

export type SerializedRosterValidation = {
  valid: boolean
  blockers: SerializedSchedulingConflict[]
  warnings: SerializedSchedulingConflict[]
  infos: SerializedSchedulingConflict[]
  coverage: RosterValidationResult["coverage"]
  summary: RosterValidationResult["summary"]
  staffNames: Record<string, string>
  shiftTypeNames: Record<string, string>
}

export type RosterLifecycleActionState =
  | {
      ok: false
      error: string
      code?: string
      validation?: SerializedRosterValidation
    }
  | {
      ok: true
      validation?: SerializedRosterValidation
    }
  | null

function serializeConflict(conflict: SchedulingConflict): SerializedSchedulingConflict {
  return {
    code: conflict.code,
    severity: conflict.severity,
    blocking: conflict.blocking,
    rule: conflict.rule,
    message: conflict.message,
    staffId: conflict.staffId,
    assignmentId: conflict.assignmentId,
    date: conflict.date,
    relatedAssignmentId: conflict.relatedAssignmentId,
    metadata: conflict.metadata,
  }
}

export function serializeRosterValidation(
  validation: RosterValidationResult,
): SerializedRosterValidation {
  return {
    valid: validation.valid,
    blockers: validation.blockers.map(serializeConflict),
    warnings: validation.warnings.map(serializeConflict),
    infos: validation.infos.map(serializeConflict),
    coverage: validation.coverage,
    summary: validation.summary,
    staffNames: validation.staffNames,
    shiftTypeNames: validation.shiftTypeNames,
  }
}
