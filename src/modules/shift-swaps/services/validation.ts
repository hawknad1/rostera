import { loadApprovedLeaveForStaffIds } from "@/modules/leave/services/scheduling-leave"
import { schedulingConfigForOrganization } from "@/modules/organizations/services/scheduling-policy"
import { buildSchedulingContext } from "@/modules/scheduling/engine/buildSchedulingContext"
import { detectConflicts } from "@/modules/scheduling/engine/detectConflicts"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import { swapError } from "@/modules/shift-swaps/errors"
import type { PublicOrm } from "@/modules/shift-swaps/services/access"

type AssignmentRow = {
  id: string
  organizationId: string
  rosterId: string
  departmentId: string
  staffId: string
  shiftTypeId: string
  professionId: string
  date: string
  isOvernight: boolean
  startDateTime: unknown
  endDateTime: unknown
}

type StaffRow = {
  id: string
  organizationId: string
  professionId: string
  employmentStatus: string
  departmentId: string
}

type RosterRow = {
  id: string
  organizationId: string
  departmentId: string
  startDate: string
  endDate: string
  status: string
}

export type SwapSimulation = {
  blockers: SchedulingConflict[]
  warnings: SchedulingConflict[]
}

function involvesSwapStaff(
  conflict: SchedulingConflict,
  requesterStaffId: string,
  targetStaffId: string,
) {
  return conflict.staffId === requesterStaffId || conflict.staffId === targetStaffId
}

export async function simulateSwapAssignments(
  orm: PublicOrm,
  input: {
    organizationId: string
    timeZone: string
    roster: RosterRow
    source: AssignmentRow
    target: AssignmentRow
    requester: StaffRow
    targetStaff: StaffRow
  },
): Promise<SwapSimulation> {
  const organizationId = input.organizationId
  const staffIds = [input.requester.id, input.targetStaff.id]

  const [requesterAssignments, targetAssignments, requirements] = await Promise.all([
    orm.public.ShiftAssignment.where({
      organizationId,
      staffId: input.requester.id,
    }).all(),
    orm.public.ShiftAssignment.where({
      organizationId,
      staffId: input.targetStaff.id,
    }).all(),
    orm.public.StaffingRequirement.where({
      organizationId,
      departmentId: input.roster.departmentId,
    }).all(),
  ])

  const assignmentsById = new Map<string, AssignmentRow>()
  for (const row of [...requesterAssignments, ...targetAssignments]) {
    if (row.organizationId === organizationId) {
      assignmentsById.set(String(row.id), row)
    }
  }

  assignmentsById.set(String(input.source.id), input.source)
  assignmentsById.set(String(input.target.id), input.target)

  const simulated = [...assignmentsById.values()].map((assignment) => {
    if (assignment.id === input.source.id) {
      return {
        ...assignment,
        staffId: input.targetStaff.id,
      }
    }

    if (assignment.id === input.target.id) {
      return {
        ...assignment,
        staffId: input.requester.id,
      }
    }

    return assignment
  })

  const [schedulingConfig, leavePeriods] = await Promise.all([
    schedulingConfigForOrganization(orm, organizationId),
    loadApprovedLeaveForStaffIds(orm, {
      organizationId,
      staffIds,
    }),
  ])

  const context = buildSchedulingContext({
    organizationId,
    timeZone: input.timeZone,
    roster: {
      id: input.roster.id,
      departmentId: input.roster.departmentId,
      startDate: input.roster.startDate,
      endDate: input.roster.endDate,
    },
    staff: [
      {
        id: input.requester.id,
        organizationId: input.requester.organizationId,
        professionId: input.requester.professionId,
      },
      {
        id: input.targetStaff.id,
        organizationId: input.targetStaff.organizationId,
        professionId: input.targetStaff.professionId,
      },
    ],
    assignments: simulated,
    requirements: requirements
      .filter(
        (requirement) =>
          requirement.organizationId === organizationId &&
          requirement.departmentId === input.roster.departmentId,
      )
      .map((requirement) => ({
        shiftTypeId: requirement.shiftTypeId,
        professionId: requirement.professionId,
        requiredCount: requirement.requiredCount,
      })),
    leavePeriods,
    config: schedulingConfig,
  })

  const result = detectConflicts(context)
  const relevant = result.conflicts.filter((conflict) =>
    involvesSwapStaff(conflict, input.requester.id, input.targetStaff.id),
  )

  return {
    blockers: relevant.filter((conflict) => conflict.blocking),
    warnings: relevant.filter((conflict) => !conflict.blocking),
  }
}

export function throwIfSwapBlocked(simulation: SwapSimulation): void {
  if (simulation.blockers.length > 0) {
    throw swapError("SWAP_SCHEDULING_CONFLICT", simulation.blockers)
  }
}
