import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"

export type RosterCoverageSummary = {
  requirementCount: number
  satisfiedCount: number
  understaffedCount: number
  overstaffedCount: number
}

export type RosterValidationSummary = {
  assignmentsChecked: number
  blockerCount: number
  warningCount: number
  infoCount: number
}

export type RosterValidationResult = {
  valid: boolean
  blockers: SchedulingConflict[]
  warnings: SchedulingConflict[]
  infos: SchedulingConflict[]
  coverage: RosterCoverageSummary
  summary: RosterValidationSummary
  staffNames: Record<string, string>
  shiftTypeNames: Record<string, string>
}
