import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { describeShiftDuration, ShiftTimeError } from "@/lib/dates/shift-time"
import { isExclusionConstraintViolation } from "@/lib/db/exclusion-constraint"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { RosterError, rosterError, type RosterErrorCode } from "@/modules/rosters/errors"
import type { CreateAssignmentInput } from "@/modules/rosters/schemas/assignment"
import {
  assertAssignmentDateInRoster,
  assertNoDuplicateAssignment,
  assertRosterDraft,
  assertShiftTypeAssignable,
  assertStaffAssignable,
  assertStaffProfession,
  buildAssignmentWindow,
} from "@/modules/rosters/validation/assignment-validation"
import { loadApprovedLeaveForAssignment } from "@/modules/leave/services/scheduling-leave"
import { buildSchedulingContext } from "@/modules/scheduling/engine/buildSchedulingContext"
import { validateAssignment } from "@/modules/scheduling/engine/validateAssignment"
import type {
  SchedulingConflict,
  SchedulingConflictCode,
} from "@/modules/scheduling/types/scheduling-conflict"
import { schedulingConfigForOrganization } from "@/modules/organizations/services/scheduling-policy"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm
type TxClient = { orm: PublicOrm }

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

function sortStaff<T extends { lastName: string; firstName: string; staffNumber: string }>(
  rows: T[],
) {
  return [...rows].sort((left, right) => {
    const last = left.lastName.localeCompare(right.lastName)
    if (last !== 0) {
      return last
    }

    const first = left.firstName.localeCompare(right.firstName)
    if (first !== 0) {
      return first
    }

    return left.staffNumber.localeCompare(right.staffNumber)
  })
}

function sortByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name))
}

function withDuration<T extends { startTime: string; endTime: string; isOvernight: boolean }>(
  shift: T,
) {
  const window = describeShiftDuration(shift)
  return {
    ...shift,
    startTime: window.startTime,
    endTime: window.endTime,
    durationLabel: window.durationLabel,
  }
}

export async function listAssignmentFormOptions(rosterId: string) {
  const membership = await requireRosterAccess(permissions.rosterEdit)
  const roster = await db.orm.public.Roster.where({
    id: rosterId,
    organizationId: membership.organizationId,
  }).first()

  if (!roster) {
    throw rosterError("ROSTER_NOT_FOUND")
  }

  const [staff, shiftTypes, professions] = await Promise.all([
    db.orm.public.StaffProfile.where({
      organizationId: membership.organizationId,
      departmentId: roster.departmentId,
      employmentStatus: "ACTIVE",
    }).all(),
    db.orm.public.ShiftType.where({
      organizationId: membership.organizationId,
      isActive: true,
    }).all(),
    Promise.all([
      db.orm.public.Profession.where({ organizationId: null }).all(),
      db.orm.public.Profession.where({ organizationId: membership.organizationId }).all(),
    ]),
  ])

  const professionMap = new Map(
    [...professions[0], ...professions[1]].map((profession) => [profession.id, profession]),
  )

  return {
    roster,
    staff: sortStaff(staff).map((member) => ({
      id: member.id,
      firstName: member.firstName,
      middleName: member.middleName,
      lastName: member.lastName,
      staffNumber: member.staffNumber,
      professionId: member.professionId,
      professionName: professionMap.get(member.professionId)?.name ?? "Unknown profession",
    })),
    shiftTypes: sortByName(shiftTypes).map(withDuration),
  }
}

export type CreateAssignmentResult = {
  assignment: {
    id: string
    organizationId: string
    rosterId: string
    departmentId: string
    staffId: string
    shiftTypeId: string
    professionId: string
    date: string
    shiftStartTime: string
    shiftEndTime: string
    isOvernight: boolean
    startDateTime: unknown
    endDateTime: unknown
  }
  warnings: SchedulingConflict[]
}

const blockingSchedulingCodes: Partial<Record<SchedulingConflictCode, RosterErrorCode>> = {
  ASSIGNMENT_OVERLAP: "ASSIGNMENT_OVERLAP",
  LEAVE_CONFLICT: "LEAVE_CONFLICT",
  INSUFFICIENT_REST: "INSUFFICIENT_REST",
  MAXIMUM_HOURS_EXCEEDED: "MAXIMUM_HOURS_EXCEEDED",
  CONSECUTIVE_SHIFT_LIMIT: "CONSECUTIVE_SHIFT_LIMIT",
  QUALIFICATION_MISMATCH: "QUALIFICATION_MISMATCH",
  NIGHT_SHIFT_LIMIT: "NIGHT_SHIFT_LIMIT",
  WEEKEND_LIMIT: "WEEKEND_LIMIT",
}

function throwBlockingSchedulingConflict(conflict: SchedulingConflict): never {
  const code = blockingSchedulingCodes[conflict.code]
  throw rosterError(code ?? "FAILED")
}

export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<CreateAssignmentResult> {
  const membership = await requireRosterAccess(permissions.rosterEdit)
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)

  try {
    return await db.transaction(async (tx: TxClient) => {
      const roster = await tx.orm.public.Roster.where({
        id: input.rosterId,
        organizationId,
      }).first()

      if (!roster) {
        throw rosterError("ROSTER_NOT_FOUND")
      }

      assertRosterDraft(roster)
      assertAssignmentDateInRoster(input.date, roster)

      const staff = await tx.orm.public.StaffProfile.where({
        id: input.staffId,
        organizationId,
      }).first()

      if (!staff) {
        throw rosterError("STAFF_NOT_FOUND")
      }

      assertStaffAssignable(staff, roster)
      const professionId = assertStaffProfession(staff)

      const profession = await tx.orm.public.Profession.where({
        id: professionId,
      }).first()

      if (!profession) {
        throw rosterError("STAFF_NO_PROFESSION")
      }

      const shiftType = await tx.orm.public.ShiftType.where({
        id: input.shiftTypeId,
        organizationId,
      }).first()

      if (!shiftType) {
        throw rosterError("SHIFT_TYPE_NOT_FOUND")
      }

      assertShiftTypeAssignable(shiftType)

      const existing = await tx.orm.public.ShiftAssignment.where({
        organizationId,
        staffId: staff.id,
      }).all()

      assertNoDuplicateAssignment(existing, {
        rosterId: roster.id,
        staffId: staff.id,
        shiftTypeId: shiftType.id,
        date: input.date,
      })

      const window = buildAssignmentWindow(
        {
          date: input.date,
          startTime: shiftType.startTime,
          endTime: shiftType.endTime,
          isOvernight: shiftType.isOvernight,
        },
        timeZone,
      )

      const rosterAssignments = await tx.orm.public.ShiftAssignment.where({
        organizationId,
        rosterId: roster.id,
      }).all()
      const requirements = await tx.orm.public.StaffingRequirement.where({
        organizationId,
        departmentId: roster.departmentId,
      }).all()

      const assignmentsById = new Map<string, (typeof existing)[number]>()
      for (const row of [...existing, ...rosterAssignments]) {
        assignmentsById.set(String(row.id), row)
      }

      const schedulingConfig = await schedulingConfigForOrganization(tx.orm, organizationId)
      const leavePeriods = await loadApprovedLeaveForAssignment(tx.orm, {
        organizationId,
        staffId: staff.id,
        date: input.date,
      })

      const context = buildSchedulingContext({
        organizationId,
        timeZone,
        roster: {
          id: roster.id,
          departmentId: roster.departmentId,
          startDate: roster.startDate,
          endDate: roster.endDate,
        },
        staff: [
          {
            id: staff.id,
            organizationId: staff.organizationId,
            professionId,
          },
        ],
        assignments: [...assignmentsById.values()],
        requirements: requirements.map((requirement) => ({
          shiftTypeId: requirement.shiftTypeId,
          professionId: requirement.professionId,
          requiredCount: requirement.requiredCount,
        })),
        leavePeriods,
        config: schedulingConfig,
      })

      const evaluation = validateAssignment(context, {
        organizationId,
        rosterId: roster.id,
        staffId: staff.id,
        shiftTypeId: shiftType.id,
        professionId,
        date: input.date,
        isOvernight: shiftType.isOvernight,
        startDateTime: window.start,
        endDateTime: window.end,
      })

      const blocking = evaluation.conflicts.find((conflict) => conflict.blocking)
      if (blocking) {
        throwBlockingSchedulingConflict(blocking)
      }

      const assignment = await tx.orm.public.ShiftAssignment.create({
        organizationId,
        rosterId: roster.id,
        departmentId: roster.departmentId,
        staffId: staff.id,
        shiftTypeId: shiftType.id,
        professionId,
        date: input.date,
        shiftStartTime: shiftType.startTime,
        shiftEndTime: shiftType.endTime,
        isOvernight: shiftType.isOvernight,
        startDateTime: window.start,
        endDateTime: window.end,
      })

      return {
        assignment,
        warnings: evaluation.conflicts.filter((conflict) => !conflict.blocking),
      }
    })
  } catch (error) {
    if (error instanceof RosterError) {
      throw error
    }

    if (error instanceof ShiftTimeError) {
      throw rosterError("FAILED")
    }

    if (isExclusionConstraintViolation(error)) {
      throw rosterError("ASSIGNMENT_OVERLAP")
    }

    if (isUniqueConstraintViolation(error)) {
      throw rosterError("ASSIGNMENT_DUPLICATE")
    }

    throw rosterError("FAILED")
  }
}

export async function deleteAssignment(input: { id: string }) {
  const membership = await requireRosterAccess(permissions.rosterEdit)
  const organizationId = membership.organizationId

  const assignment = await db.orm.public.ShiftAssignment.where({
    id: input.id,
    organizationId,
  }).first()

  if (!assignment) {
    throw rosterError("ASSIGNMENT_NOT_FOUND")
  }

  const roster = await db.orm.public.Roster.where({
    id: assignment.rosterId,
    organizationId,
  }).first()

  if (!roster) {
    throw rosterError("ROSTER_NOT_FOUND")
  }

  assertRosterDraft(roster)

  const deleted = await db.orm.public.ShiftAssignment.where({
    id: assignment.id,
    organizationId,
  }).delete()

  if (!deleted) {
    throw rosterError("ASSIGNMENT_NOT_FOUND")
  }

  return deleted
}
