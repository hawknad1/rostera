import { intervalsOverlap } from "@/lib/dates/assignment-window"
import { assignmentsForStaff } from "@/modules/scheduling/engine/groupAssignments"
import { schedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

export const leaveConflictRule: SchedulingRule = {
  id: "leaveConflict",
  constraint: "HARD",
  evaluate(context) {
    const conflicts: SchedulingConflict[] = []
    const staffId = context.focus?.staffId
    const leavePeriods = staffId
      ? context.leavePeriods.filter((period) => period.staffId === staffId)
      : context.leavePeriods

    for (const period of leavePeriods) {
      if (period.status !== "APPROVED") {
        continue
      }

      const assignments = assignmentsForStaff(context.assignments, period.staffId)

      for (const assignment of assignments) {
        if (context.focus?.assignmentId && assignment.id !== context.focus.assignmentId) {
          continue
        }

        if (
          !intervalsOverlap(
            period.start,
            period.end,
            assignment.startDateTime,
            assignment.endDateTime,
          )
        ) {
          continue
        }

        conflicts.push(
          schedulingConflict({
            code: "LEAVE_CONFLICT",
            severity: "ERROR",
            blocking: true,
            rule: leaveConflictRule.id,
            message: "This assignment overlaps approved leave.",
            staffId: period.staffId,
            assignmentId: assignment.id,
            date: assignment.date,
          }),
        )
      }
    }

    return conflicts
  },
}
