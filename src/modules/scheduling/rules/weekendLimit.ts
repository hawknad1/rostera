import { isoWeekBounds, isWeekendDate } from "@/lib/dates/calendar-date"
import { isDateInInclusiveRange } from "@/lib/dates/calendar-date"
import { groupAssignmentsByStaffId } from "@/modules/scheduling/engine/groupAssignments"
import {
  resolveSchedulingPolicy,
  resolveWeekendConstraint,
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

export const weekendLimitRule: SchedulingRule = {
  id: "weekendLimit",
  constraint: "SOFT",
  evaluate(context) {
    const maximumShifts = resolveSchedulingPolicy(context.config).maximumWeekendShifts
    if (!isSchedulingConstraintEnabled(maximumShifts)) {
      return []
    }

    const grouped = groupAssignmentsByStaffId(context.assignments)
    const staffIds = context.focus ? [context.focus.staffId] : [...grouped.keys()].sort()
    const conflicts: SchedulingConflict[] = []
    const constraint = resolveWeekendConstraint(context.config)
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
        const weekendShifts = assignments.filter(
          (assignment) =>
            isWeekendDate(assignment.date) &&
            isDateInInclusiveRange(assignment.date, week.startDate, week.endDate),
        )

        if (weekendShifts.length <= maximumShifts) {
          continue
        }

        conflicts.push(
          schedulingConflict({
            code: "WEEKEND_LIMIT",
            severity,
            blocking,
            rule: weekendLimitRule.id,
            message: "This assignment exceeds the weekend shift limit.",
            staffId,
            assignmentId: context.focus?.assignmentId,
            date: context.focus?.date ?? weekendShifts[weekendShifts.length - 1]?.date,
            metadata: {
              weekendShifts: weekendShifts.length,
              maximumShifts,
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
