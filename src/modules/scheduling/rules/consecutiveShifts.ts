import { parseCalendarDate } from "@/lib/dates/calendar-date"
import { groupAssignmentsByStaffId } from "@/modules/scheduling/engine/groupAssignments"
import { resolveSchedulingPolicy } from "@/modules/scheduling/policy/resolve"
import { schedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import { isSchedulingConstraintEnabled } from "@/modules/scheduling/types/scheduling-policy"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

function uniqueSortedDates(dates: string[]) {
  return [...new Set(dates)].sort()
}

function consecutiveRuns(dates: string[]) {
  const sorted = uniqueSortedDates(dates)
  if (sorted.length === 0) {
    return []
  }

  const runs: string[][] = []
  let current = [sorted[0]]

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = parseCalendarDate(sorted[index - 1])
    const next = parseCalendarDate(sorted[index])

    if (previous.add({ days: 1 }).equals(next)) {
      current.push(sorted[index])
      continue
    }

    runs.push(current)
    current = [sorted[index]]
  }

  runs.push(current)
  return runs
}

export const consecutiveShiftsRule: SchedulingRule = {
  id: "consecutiveShifts",
  constraint: "HARD",
  evaluate(context) {
    const maximumConsecutiveDays = resolveSchedulingPolicy(context.config).maximumConsecutiveDays
    if (!isSchedulingConstraintEnabled(maximumConsecutiveDays)) {
      return []
    }

    const grouped = groupAssignmentsByStaffId(context.assignments)
    const staffIds = context.focus ? [context.focus.staffId] : [...grouped.keys()].sort()
    const conflicts: SchedulingConflict[] = []

    for (const staffId of staffIds) {
      const assignments = grouped.get(staffId) ?? []
      const runs = consecutiveRuns(assignments.map((assignment) => assignment.date))

      for (const run of runs) {
        if (run.length <= maximumConsecutiveDays) {
          continue
        }

        if (context.focus && !run.includes(context.focus.date)) {
          continue
        }

        conflicts.push(
          schedulingConflict({
            code: "CONSECUTIVE_SHIFT_LIMIT",
            severity: "ERROR",
            blocking: true,
            rule: consecutiveShiftsRule.id,
            message: "This assignment exceeds the consecutive workday limit.",
            staffId,
            assignmentId: context.focus?.assignmentId,
            date: context.focus?.date ?? run[run.length - 1],
            metadata: {
              consecutiveDays: run.length,
              maximumConsecutiveDays,
              startDate: run[0],
              endDate: run[run.length - 1],
            },
          }),
        )
      }
    }

    return conflicts
  },
}
