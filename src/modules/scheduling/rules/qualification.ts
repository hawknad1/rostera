import { schedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

export const qualificationRule: SchedulingRule = {
  id: "qualification",
  constraint: "HARD",
  evaluate(context) {
    const staffById = new Map(context.staff.map((member) => [member.id, member]))
    const assignments = context.focus
      ? context.assignments.filter((assignment) => assignment.id === context.focus?.assignmentId)
      : context.assignments
    const conflicts: SchedulingConflict[] = []

    for (const assignment of assignments) {
      const member = staffById.get(assignment.staffId)
      const requiredTypeIds = assignment.requiredQualificationTypeIds ?? []

      if (!member || member.professionId !== assignment.professionId) {
        conflicts.push(
          schedulingConflict({
            code: "QUALIFICATION_MISMATCH",
            severity: "CRITICAL",
            blocking: true,
            rule: qualificationRule.id,
            message: "This staff member's profession is not compatible with this assignment.",
            staffId: assignment.staffId,
            assignmentId: assignment.id,
            date: assignment.date,
            metadata: {
              staffProfessionId: member?.professionId,
              assignmentProfessionId: assignment.professionId,
            },
          }),
        )
        continue
      }

      if (requiredTypeIds.length === 0) {
        continue
      }

      const held = new Set((member.qualifications ?? []).map((qualification) => qualification.typeId))
      const missing = requiredTypeIds.filter((typeId) => !held.has(typeId))
      if (missing.length === 0) {
        continue
      }

      conflicts.push(
        schedulingConflict({
          code: "QUALIFICATION_MISMATCH",
          severity: "CRITICAL",
          blocking: true,
          rule: qualificationRule.id,
          message: "This staff member's profession is not compatible with this assignment.",
          staffId: assignment.staffId,
          assignmentId: assignment.id,
          date: assignment.date,
          metadata: {
            missingQualificationTypeIds: missing,
          },
        }),
      )
    }

    return conflicts
  },
}
