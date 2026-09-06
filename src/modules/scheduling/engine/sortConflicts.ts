import type { ConflictSeverity } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"

const severityOrder: Record<ConflictSeverity, number> = {
  CRITICAL: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
}

export function sortConflicts(conflicts: SchedulingConflict[]) {
  return [...conflicts].sort((left, right) => {
    const severity = severityOrder[left.severity] - severityOrder[right.severity]
    if (severity !== 0) {
      return severity
    }

    const date = (left.date ?? "").localeCompare(right.date ?? "")
    if (date !== 0) {
      return date
    }

    const staff = (left.staffId ?? "").localeCompare(right.staffId ?? "")
    if (staff !== 0) {
      return staff
    }

    const rule = left.rule.localeCompare(right.rule)
    if (rule !== 0) {
      return rule
    }

    return left.code.localeCompare(right.code)
  })
}
