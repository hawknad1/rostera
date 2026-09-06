import { isoWeekBounds } from "@/lib/dates/calendar-date"
import { isDateInInclusiveRange } from "@/lib/dates/calendar-date"
import { groupAssignmentsByStaffId } from "@/modules/scheduling/engine/groupAssignments"
import {
  resolveNightShiftConstraint,
  resolveSchedulingPolicy,
} from "@/modules/scheduling/policy/resolve"
import {
  isBlockingConstraint,
  schedulingConflict,
} from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import { isSchedulingConstraintEnabled } from "@/modules/scheduling/types/scheduling-policy"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

function weekKeys(dates: string[], focusDate?: string) {
  if (focusDate) {
    return [isoWeekBounds(focusDate).startDate]
  }

  return [...new Set(dates.map((date) => isoWeekBounds(date).startDate))].sort()
}

export const nightShiftLimitRule: SchedulingRule = {
  id: "nightShiftLimit",
  constraint: "SOFT",
  evaluate(context) {
    const maximumPerWeek = resolveSchedulingPolicy(context.config).maximumNightShiftsPerWeek
    if (!isSchedulingConstraintEnabled(maximumPerWeek)) {
      return []
    }

    const grouped = groupAssignmentsByStaffId(context.assignments)
    const staffIds = context.focus ? [context.focus.staffId] : [...grouped.keys()].sort()
    const conflicts: SchedulingConflict[] = []
    const constraint = resolveNightShiftConstraint(context.config)
    const severity = constraint === "HARD" ? "ERROR" : "WARNING"
    const blocking = isBlockingConstraint(constraint, severity)

    for (const staffId of staffIds) {
      const assignments = grouped.get(staffId) ?? []
      const weeks = weekKeys(
        assignments.map((assignment) => assignment.date),
        context.focus?.date,
      )

      for (const weekStart of weeks) {
        const week = isoWeekBounds(weekStart)
        const nightShifts = assignments.filter(
          (assignment) =>
            assignment.isOvernight &&
            isDateInInclusiveRange(assignment.date, week.startDate, week.endDate),
        )

        if (nightShifts.length <= maximumPerWeek) {
          continue
        }

        conflicts.push(
          schedulingConflict({
            code: "NIGHT_SHIFT_LIMIT",
            severity,
            blocking,
            rule: nightShiftLimitRule.id,
            message: "This assignment exceeds the recommended night-shift limit.",
            staffId,
            assignmentId: context.focus?.assignmentId,
            date: context.focus?.date ?? nightShifts[nightShifts.length - 1]?.date,
            metadata: {
              nightShifts: nightShifts.length,
              maximumPerWeek,
              weekStart: week.startDate,
              weekEnd: week.endDate,
            },
          }),
        )
      }
    }

    return conflicts
  },
}
