import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { rosterError } from "@/modules/rosters/errors"
import { calculateCoverage } from "@/modules/rosters/services/coverage"
import type { RosterValidationResult } from "@/modules/rosters/types/validation"
import { loadApprovedLeaveForRoster } from "@/modules/leave/services/scheduling-leave"
import { buildSchedulingContext } from "@/modules/scheduling/engine/buildSchedulingContext"
import { detectConflicts } from "@/modules/scheduling/engine/detectConflicts"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import { schedulingConfigForOrganization } from "@/modules/organizations/services/scheduling-policy"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm

type RosterRow = {
  id: string
  organizationId: string
  departmentId: string
  startDate: string
  endDate: string
}

async function requireRosterAccess(permission: Permission) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw rosterError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permission)

  if (!authorized) {
    throw rosterError("FORBIDDEN")
  }

  return membership
}

function staffDisplayName(member: {
  firstName: string
  middleName?: string | null
  lastName: string
}) {
  return [member.firstName, member.middleName, member.lastName].filter(Boolean).join(" ")
}

function partitionConflicts(conflicts: SchedulingConflict[]) {
  const blockers = conflicts.filter((conflict) => conflict.blocking)
  const nonBlocking = conflicts.filter((conflict) => !conflict.blocking)
  const infos = nonBlocking.filter((conflict) => conflict.severity === "INFO")
  const warnings = nonBlocking.filter((conflict) => conflict.severity !== "INFO")

  return { blockers, warnings, infos }
}

export function toRosterValidationResult(
  conflicts: SchedulingConflict[],
  coverage: ReturnType<typeof calculateCoverage>,
  assignmentsChecked: number,
  lookups?: {
    staffNames?: Record<string, string>
    shiftTypeNames?: Record<string, string>
  },
): RosterValidationResult {
  const { blockers, warnings, infos } = partitionConflicts(conflicts)
  const requirementCells = coverage.filter((cell) => cell.requiredCount > 0)

  return {
    valid: blockers.length === 0,
    blockers,
    warnings,
    infos,
    coverage: {
      requirementCount: requirementCells.length,
      satisfiedCount: requirementCells.filter((cell) => cell.status === "covered").length,
      understaffedCount: coverage.filter((cell) => cell.status === "understaffed").length,
      overstaffedCount: coverage.filter((cell) => cell.status === "overstaffed").length,
    },
    summary: {
      assignmentsChecked,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      infoCount: infos.length,
    },
    staffNames: lookups?.staffNames ?? {},
    shiftTypeNames: lookups?.shiftTypeNames ?? {},
  }
}

export async function evaluateRosterValidation(
  orm: PublicOrm,
  input: {
    organizationId: string
    timeZone: string
    roster: RosterRow
  },
): Promise<RosterValidationResult> {
  const organizationId = input.organizationId
  const roster = input.roster

  const [assignments, staff, requirements, shiftTypes] = await Promise.all([
    orm.public.ShiftAssignment.where({ organizationId }).all(),
    orm.public.StaffProfile.where({ organizationId }).all(),
    orm.public.StaffingRequirement.where({
      organizationId,
      departmentId: roster.departmentId,
    }).all(),
    orm.public.ShiftType.where({ organizationId }).all(),
  ])

  const tenantAssignments = assignments.filter(
    (assignment) => assignment.organizationId === organizationId,
  )
  const tenantStaff = staff.filter((member) => member.organizationId === organizationId)
  const tenantRequirements = requirements.filter(
    (requirement) =>
      requirement.organizationId === organizationId &&
      requirement.departmentId === roster.departmentId,
  )
  const tenantShiftTypes = shiftTypes.filter(
    (shiftType) => shiftType.organizationId === organizationId,
  )

  const rosterAssignments = tenantAssignments.filter(
    (assignment) => assignment.rosterId === roster.id,
  )
  const rosterStaffIds = new Set(rosterAssignments.map((assignment) => assignment.staffId))
  const relevantAssignments = tenantAssignments.filter(
    (assignment) =>
      assignment.rosterId === roster.id || rosterStaffIds.has(assignment.staffId),
  )
  const relevantStaff = tenantStaff.filter(
    (member) => rosterStaffIds.has(member.id) && member.professionId,
  )

  const schedulingConfig = await schedulingConfigForOrganization(orm, organizationId)
  const leavePeriods = await loadApprovedLeaveForRoster(orm, {
    organizationId,
    staffIds: [...rosterStaffIds],
    startDate: roster.startDate,
    endDate: roster.endDate,
  })

  const context = buildSchedulingContext({
    organizationId,
    timeZone: input.timeZone,
    roster: {
      id: roster.id,
      departmentId: roster.departmentId,
      startDate: roster.startDate,
      endDate: roster.endDate,
    },
    staff: relevantStaff.map((member) => ({
      id: member.id,
      organizationId: member.organizationId,
      professionId: member.professionId as string,
    })),
    assignments: relevantAssignments,
    requirements: tenantRequirements.map((requirement) => ({
      shiftTypeId: requirement.shiftTypeId,
      professionId: requirement.professionId,
      requiredCount: requirement.requiredCount,
    })),
    leavePeriods,
    config: schedulingConfig,
  })

  const detection = detectConflicts(context)
  const coverage = calculateCoverage({
    startDate: roster.startDate,
    endDate: roster.endDate,
    requirements: tenantRequirements,
    assignments: rosterAssignments,
  })

  const staffNames = Object.fromEntries(
    tenantStaff
      .filter((member) => rosterStaffIds.has(member.id))
      .map((member) => [member.id, staffDisplayName(member)]),
  )
  const shiftTypeNames = Object.fromEntries(
    tenantShiftTypes.map((shiftType) => [shiftType.id, shiftType.name]),
  )

  return toRosterValidationResult(detection.conflicts, coverage, rosterAssignments.length, {
    staffNames,
    shiftTypeNames,
  })
}

export async function validateRoster(rosterId: string) {
  const membership = await requireRosterAccess(permissions.rosterView)
  const roster = await db.orm.public.Roster.where({
    id: rosterId,
    organizationId: membership.organizationId,
  }).first()

  if (!roster) {
    throw rosterError("ROSTER_NOT_FOUND")
  }

  return evaluateRosterValidation(db.orm, {
    organizationId: membership.organizationId,
    timeZone: String(membership.organization.timezone),
    roster,
  })
}
