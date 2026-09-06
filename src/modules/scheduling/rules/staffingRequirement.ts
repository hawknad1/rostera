import { calculateCoverage } from "@/modules/scheduling/engine/calculateCoverage"
import { rosterAssignments } from "@/modules/scheduling/engine/groupAssignments"
import { schedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

export const staffingRequirementRule: SchedulingRule = {
  id: "staffingRequirement",
  constraint: "SOFT",
  evaluate(context) {
    const cells = calculateCoverage({
      startDate: context.roster.startDate,
      endDate: context.roster.endDate,
      requirements: context.requirements,
      assignments: rosterAssignments(context.assignments, context.roster.id),
    })

    const relevant = context.focus
      ? cells.filter(
          (cell) =>
            cell.date === context.focus?.date &&
            cell.shiftTypeId === context.focus.shiftTypeId &&
            cell.professionId === context.focus.professionId,
        )
      : cells

    const conflicts: SchedulingConflict[] = []

    for (const cell of relevant) {
      if (cell.status === "understaffed") {
        conflicts.push(
          schedulingConflict({
            code: "STAFFING_SHORTFALL",
            severity: "WARNING",
            blocking: false,
            rule: staffingRequirementRule.id,
            message: `Department is currently understaffed by ${cell.shortfall} for this shift.`,
            date: cell.date,
            metadata: {
              shiftTypeId: cell.shiftTypeId,
              professionId: cell.professionId,
              requiredCount: cell.requiredCount,
              assignedCount: cell.assignedCount,
              shortfall: cell.shortfall,
            },
          }),
        )
      }

      if (cell.status === "overstaffed") {
        conflicts.push(
          schedulingConflict({
            code: "STAFFING_OVERSTAFFED",
            severity: "INFO",
            blocking: false,
            rule: staffingRequirementRule.id,
            message: "Department is currently overstaffed for this shift.",
            date: cell.date,
            metadata: {
              shiftTypeId: cell.shiftTypeId,
              professionId: cell.professionId,
              requiredCount: cell.requiredCount,
              assignedCount: cell.assignedCount,
              surplus: cell.surplus,
            },
          }),
        )
      }
    }

    return conflicts
  },
}
