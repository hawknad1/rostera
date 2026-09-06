import { isoWeekBounds } from "@/lib/dates/calendar-date"
import { calculateWorkingHours } from "@/modules/scheduling/engine/calculateWorkingHours"
import { groupAssignmentsByStaffId } from "@/modules/scheduling/engine/groupAssignments"
import { resolveSchedulingPolicy } from "@/modules/scheduling/policy/resolve"
import { schedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import { isSchedulingConstraintEnabled } from "@/modules/scheduling/types/scheduling-policy"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

function weekKeysForStaff(
  dates: string[],
  focusDate?: string,
) {
  if (focusDate) {
    return [isoWeekBounds(focusDate).startDate]
  }

  const weeks = new Set<string>()
  for (const date of dates) {
    weeks.add(isoWeekBounds(date).startDate)
  }

  return [...weeks].sort()
}

export const maximumHoursRule: SchedulingRule = {
  id: "maximumHours",
  constraint: "HARD",
  evaluate(context) {
    const maximumWeeklyMinutes = resolveSchedulingPolicy(context.config).maximumWeeklyMinutes
    if (!isSchedulingConstraintEnabled(maximumWeeklyMinutes)) {
      return []
    }

    const grouped = groupAssignmentsByStaffId(context.assignments)
    const staffIds = context.focus ? [context.focus.staffId] : [...grouped.keys()].sort()
    const conflicts: SchedulingConflict[] = []

    for (const staffId of staffIds) {
      const assignments = grouped.get(staffId) ?? []
      const weeks = weekKeysForStaff(
        assignments.map((assignment) => assignment.date),
        context.focus?.date,
      )

      for (const weekStart of weeks) {
        const week = isoWeekBounds(weekStart)
        const scheduledMinutes = calculateWorkingHours({
          assignments,
          staffId,
          startDate: week.startDate,
          endDate: week.endDate,
        })

        if (scheduledMinutes <= maximumWeeklyMinutes) {
          continue
        }

        const focusAssignment = context.focus?.assignmentId
          ? assignments.find((assignment) => assignment.id === context.focus?.assignmentId)
          : assignments.find((assignment) => assignment.date >= week.startDate && assignment.date <= week.endDate)

        conflicts.push(
          schedulingConflict({
            code: "MAXIMUM_HOURS_EXCEEDED",
            severity: "ERROR",
            blocking: true,
            rule: maximumHoursRule.id,
            message: "This assignment exceeds the maximum working hours.",
            staffId,
            assignmentId: focusAssignment?.id,
            date: context.focus?.date ?? focusAssignment?.date,
            metadata: {
              scheduledMinutes,
              maximumWeeklyMinutes,
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
