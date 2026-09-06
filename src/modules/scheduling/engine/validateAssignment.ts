import { CANDIDATE_ASSIGNMENT_ID } from "@/modules/scheduling/engine/buildSchedulingContext"
import { detectConflicts } from "@/modules/scheduling/engine/detectConflicts"
import { defaultSchedulingRules } from "@/modules/scheduling/rules"
import type { SchedulingAssignment } from "@/modules/scheduling/types/scheduling-context"
import type { SchedulingContext } from "@/modules/scheduling/types/scheduling-context"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

export function validateAssignment(
  context: SchedulingContext,
  candidate: SchedulingAssignment,
  rules: SchedulingRule[] = defaultSchedulingRules,
) {
  const candidateAssignment: SchedulingAssignment = {
    ...candidate,
    id: candidate.id ?? CANDIDATE_ASSIGNMENT_ID,
    organizationId: context.organizationId,
  }

  const nextContext: SchedulingContext = {
    ...context,
    assignments: [...context.assignments, candidateAssignment],
    focus: {
      staffId: candidateAssignment.staffId,
      date: candidateAssignment.date,
      shiftTypeId: candidateAssignment.shiftTypeId,
      professionId: candidateAssignment.professionId,
      assignmentId: candidateAssignment.id,
    },
  }

  return detectConflicts(nextContext, rules)
}
