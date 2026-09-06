import { toInstant } from "@/lib/dates/assignment-window"
import { emptySchedulingConfig } from "@/modules/scheduling/policy/resolve"
import type { SchedulingConfig } from "@/modules/scheduling/types/scheduling-config"
import type { SchedulingLeavePeriod } from "@/modules/scheduling/types/leave"
import type {
  SchedulingAssignment,
  SchedulingContext,
  SchedulingRequirement,
  SchedulingRoster,
  SchedulingStaff,
} from "@/modules/scheduling/types/scheduling-context"

export const CANDIDATE_ASSIGNMENT_ID = "__candidate__"

type AssignmentInput = Omit<SchedulingAssignment, "startDateTime" | "endDateTime"> & {
  startDateTime: unknown
  endDateTime: unknown
}

export function buildSchedulingContext(input: {
  organizationId: string
  timeZone: string
  roster: SchedulingRoster
  staff: SchedulingStaff[]
  assignments: AssignmentInput[]
  requirements: SchedulingRequirement[]
  leavePeriods?: SchedulingLeavePeriod[]
  config?: SchedulingConfig
}): SchedulingContext {
  const organizationId = input.organizationId

  return {
    organizationId,
    timeZone: input.timeZone,
    roster: input.roster,
    staff: input.staff.filter((member) => member.organizationId === organizationId),
    assignments: input.assignments
      .filter((assignment) => assignment.organizationId === organizationId)
      .map((assignment) => ({
        ...assignment,
        startDateTime: toInstant(assignment.startDateTime),
        endDateTime: toInstant(assignment.endDateTime),
      })),
    requirements: input.requirements,
    leavePeriods: input.leavePeriods ?? [],
    config: input.config ?? emptySchedulingConfig(),
  }
}
