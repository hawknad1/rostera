import { Temporal } from "temporal-polyfill"

import { restMinutesBetween } from "@/lib/dates/restPeriod"
import { groupAssignmentsByStaffId } from "@/modules/scheduling/engine/groupAssignments"
import { resolveSchedulingPolicy } from "@/modules/scheduling/policy/resolve"
import { schedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import { isSchedulingConstraintEnabled } from "@/modules/scheduling/types/scheduling-policy"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

export const restPeriodRule: SchedulingRule = {
  id: "restPeriod",
  constraint: "HARD",
  evaluate(context) {
    const minimumRestMinutes = resolveSchedulingPolicy(context.config).minimumRestMinutes
    if (!isSchedulingConstraintEnabled(minimumRestMinutes)) {
      return []
    }

    const grouped = groupAssignmentsByStaffId(context.assignments)
    const staffIds = context.focus ? [context.focus.staffId] : [...grouped.keys()].sort()
    const conflicts: SchedulingConflict[] = []

    for (const staffId of staffIds) {
      const sorted = [...(grouped.get(staffId) ?? [])].sort((left, right) =>
        Temporal.Instant.compare(left.startDateTime, right.startDateTime),
      )

      for (let index = 0; index < sorted.length - 1; index += 1) {
        const current = sorted[index]
        const next = sorted[index + 1]

        if (
          context.focus?.assignmentId &&
          current.id !== context.focus.assignmentId &&
          next.id !== context.focus.assignmentId
        ) {
          continue
        }

        const gap = restMinutesBetween(current.endDateTime, next.startDateTime)
        if (gap >= minimumRestMinutes) {
          continue
        }

        const focused =
          next.id === context.focus?.assignmentId || !context.focus?.assignmentId ? next : current

        conflicts.push(
          schedulingConflict({
            code: "INSUFFICIENT_REST",
            severity: "ERROR",
            blocking: true,
            rule: restPeriodRule.id,
            message: "Insufficient rest since the previous shift.",
            staffId,
            assignmentId: focused.id,
            date: focused.date,
            relatedAssignmentId: focused === next ? current.id : next.id,
            metadata: {
              restMinutes: gap,
              minimumRestMinutes,
            },
          }),
        )
      }
    }

    return conflicts
  },
}
