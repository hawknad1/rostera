import { intervalsOverlap } from "@/lib/dates/assignment-window"
import { groupAssignmentsByStaffId } from "@/modules/scheduling/engine/groupAssignments"
import { schedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingAssignment } from "@/modules/scheduling/types/scheduling-context"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

function involvesFocus(left: SchedulingAssignment, right: SchedulingAssignment, focusId?: string) {
  if (!focusId) {
    return true
  }

  return left.id === focusId || right.id === focusId
}

export const overlapRule: SchedulingRule = {
  id: "overlap",
  constraint: "HARD",
  evaluate(context) {
    const grouped = groupAssignmentsByStaffId(context.assignments)
    const staffIds = context.focus ? [context.focus.staffId] : [...grouped.keys()].sort()
    const conflicts: SchedulingConflict[] = []

    for (const staffId of staffIds) {
      const assignments = grouped.get(staffId) ?? []

      for (let i = 0; i < assignments.length; i += 1) {
        for (let j = i + 1; j < assignments.length; j += 1) {
          const left = assignments[i]
          const right = assignments[j]

          if (
            !involvesFocus(left, right, context.focus?.assignmentId) ||
            !intervalsOverlap(
              left.startDateTime,
              left.endDateTime,
              right.startDateTime,
              right.endDateTime,
            )
          ) {
            continue
          }

          const focused =
            left.id === context.focus?.assignmentId
              ? left
              : right.id === context.focus?.assignmentId
                ? right
                : left
          const related = focused === left ? right : left

          conflicts.push(
            schedulingConflict({
              code: "ASSIGNMENT_OVERLAP",
              severity: "ERROR",
              blocking: true,
              rule: overlapRule.id,
              message: "This assignment overlaps another shift for this staff member.",
              staffId,
              assignmentId: focused.id,
              date: focused.date,
              relatedAssignmentId: related.id,
              metadata: {
                relatedDate: related.date,
                relatedShiftTypeId: related.shiftTypeId,
              },
            }),
          )
        }
      }
    }

    return conflicts
  },
}
