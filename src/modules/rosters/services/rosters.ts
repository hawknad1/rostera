import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import {
  enumerateCalendarDates,
  formatDateRange,
  formatDisplayDate,
  isDateInInclusiveRange,
} from "@/lib/dates/calendar-date"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { quoteAuditName } from "@/modules/audit/copy"
import { recordUserAudit } from "@/modules/audit/services/record"
import { rosterError } from "@/modules/rosters/errors"
import type { CreateRosterInput, UpdateRosterInput } from "@/modules/rosters/schemas/roster"
import {
  calculateCoverage,
  summarizeCoverage,
  type CoverageCell,
} from "@/modules/rosters/services/coverage"
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

function sortByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name))
}

function sortShiftTypes<T extends { name: string; startTime: string }>(rows: T[]) {
  return [...rows].sort((left, right) => {
    const start = left.startTime.localeCompare(right.startTime)
    if (start !== 0) {
      return start
    }

    return left.name.localeCompare(right.name)
  })
}

async function findOwnedRoster(orm: PublicOrm, organizationId: string, rosterId: string) {
  return orm.public.Roster.where({
    id: rosterId,
    organizationId,
  }).first()
}

async function findOwnedDepartment(orm: PublicOrm, organizationId: string, departmentId: string) {
  return orm.public.Department.where({
    id: departmentId,
    organizationId,
  }).first()
}

async function assertOwnedDepartment(orm: PublicOrm, organizationId: string, departmentId: string) {
  const department = await findOwnedDepartment(orm, organizationId, departmentId)

  if (!department) {
    throw rosterError("DEPARTMENT_NOT_FOUND")
  }

  return department
}

async function loadProfessionMap(organizationId: string) {
  const [global, organization] = await Promise.all([
    db.orm.public.Profession.where({ organizationId: null }).all(),
    db.orm.public.Profession.where({ organizationId }).all(),
  ])

  return new Map([...global, ...organization].map((profession) => [profession.id, profession]))
}

export async function listRosterFormOptions() {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw rosterError("UNAUTHENTICATED")
  }

  const [canView, canCreate, canEdit] = await Promise.all([
    hasPermission(membership, permissions.rosterView),
    hasPermission(membership, permissions.rosterCreate),
    hasPermission(membership, permissions.rosterEdit),
  ])

  if (!canView && !canCreate && !canEdit) {
    throw rosterError("FORBIDDEN")
  }

  const departments = await db.orm.public.Department.where({
    organizationId: membership.organizationId,
  }).all()

  return {
    departments: sortByName(departments),
  }
}

export async function listRosters() {
  const membership = await requireRosterAccess(permissions.rosterView)
  const organizationId = membership.organizationId

  const [rosters, departments, assignments, requirements] = await Promise.all([
    db.orm.public.Roster.where({ organizationId }).all(),
    db.orm.public.Department.where({ organizationId }).all(),
    db.orm.public.ShiftAssignment.where({ organizationId }).all(),
    db.orm.public.StaffingRequirement.where({ organizationId }).all(),
  ])

  const departmentsById = new Map(departments.map((department) => [department.id, department]))
  const assignmentsByRoster = new Map<string, typeof assignments>()

  for (const assignment of assignments) {
    const current = assignmentsByRoster.get(assignment.rosterId) ?? []
    current.push(assignment)
    assignmentsByRoster.set(assignment.rosterId, current)
  }

  return [...rosters]
    .sort((left, right) => {
      const start = right.startDate.localeCompare(left.startDate)
      if (start !== 0) {
        return start
      }

      return left.name.localeCompare(right.name)
    })
    .map((roster) => {
      const rosterAssignments = assignmentsByRoster.get(roster.id) ?? []
      const rosterRequirements = requirements.filter(
        (requirement) => requirement.departmentId === roster.departmentId,
      )
      const coverage = calculateCoverage({
        startDate: roster.startDate,
        endDate: roster.endDate,
        requirements: rosterRequirements,
        assignments: rosterAssignments,
      })

      return {
        ...roster,
        departmentName: departmentsById.get(roster.departmentId)?.name ?? "Unknown department",
        dateRangeLabel: formatDateRange(roster.startDate, roster.endDate),
        assignmentCount: rosterAssignments.length,
        coverageLabel: summarizeCoverage(coverage, rosterAssignments.length),
      }
    })
}

export async function getRoster(rosterId: string) {
  const membership = await requireRosterAccess(permissions.rosterView)
  const organizationId = membership.organizationId
  const roster = await findOwnedRoster(db.orm, organizationId, rosterId)

  if (!roster) {
    throw rosterError("ROSTER_NOT_FOUND")
  }

  const [department, assignments, shiftTypes, requirements, staff, professions] = await Promise.all([
    findOwnedDepartment(db.orm, organizationId, roster.departmentId),
    db.orm.public.ShiftAssignment.where({
      organizationId,
      rosterId: roster.id,
    }).all(),
    db.orm.public.ShiftType.where({ organizationId }).all(),
    db.orm.public.StaffingRequirement.where({
      organizationId,
      departmentId: roster.departmentId,
    }).all(),
    db.orm.public.StaffProfile.where({ organizationId }).all(),
    loadProfessionMap(organizationId),
  ])

  const staffById = new Map(staff.map((member) => [member.id, member]))
  const shiftTypesById = new Map(shiftTypes.map((shiftType) => [shiftType.id, shiftType]))
  const coverage = calculateCoverage({
    startDate: roster.startDate,
    endDate: roster.endDate,
    requirements,
    assignments,
  })

  const namedAssignments = assignments.map((assignment) => {
    const member = staffById.get(assignment.staffId)
    const shiftType = shiftTypesById.get(assignment.shiftTypeId)
    const profession = professions.get(assignment.professionId)

    return {
      ...assignment,
      staffName: member
        ? [member.firstName, member.middleName, member.lastName].filter(Boolean).join(" ")
        : "Unknown staff",
      staffNumber: member?.staffNumber ?? "",
      professionName: profession?.name ?? "Unknown profession",
      shiftTypeName: shiftType?.name ?? "Unknown shift",
      timeLabel: `${assignment.shiftStartTime}–${assignment.shiftEndTime}${
        assignment.isOvernight ? " (following day)" : ""
      }`,
    }
  })

  const assignmentsByDateAndShift = new Map<string, typeof namedAssignments>()
  for (const assignment of namedAssignments) {
    const key = `${assignment.date}|${assignment.shiftTypeId}`
    const current = assignmentsByDateAndShift.get(key) ?? []
    current.push(assignment)
    assignmentsByDateAndShift.set(key, current)
  }

  const visibleShiftTypes = sortShiftTypes(
    shiftTypes.filter((shiftType) => {
      if (shiftType.isActive) {
        return true
      }

      return assignments.some((assignment) => assignment.shiftTypeId === shiftType.id)
    }),
  )

  const days = enumerateCalendarDates(roster.startDate, roster.endDate).map((date) => ({
    date,
    displayDate: formatDisplayDate(date),
    shifts: visibleShiftTypes.map((shiftType) => {
      const shiftAssignments = [...(assignmentsByDateAndShift.get(`${date}|${shiftType.id}`) ?? [])]
        .sort((left, right) => left.staffName.localeCompare(right.staffName))
      const shiftCoverage = coverage
        .filter((cell) => cell.date === date && cell.shiftTypeId === shiftType.id)
        .map((cell) => ({
          ...cell,
          professionName: professions.get(cell.professionId)?.name ?? "Unknown profession",
        }))
        .sort((left, right) => left.professionName.localeCompare(right.professionName))

      return {
        shiftTypeId: shiftType.id,
        shiftTypeName: shiftType.name,
        startTime: shiftType.startTime,
        endTime: shiftType.endTime,
        isOvernight: shiftType.isOvernight,
        timeLabel: `${shiftType.startTime}–${shiftType.endTime}${
          shiftType.isOvernight ? " (following day)" : ""
        }`,
        assignments: shiftAssignments,
        coverage: shiftCoverage,
      }
    }),
  }))

  return {
    ...roster,
    departmentName: department?.name ?? "Unknown department",
    dateRangeLabel: formatDateRange(roster.startDate, roster.endDate),
    assignmentCount: assignments.length,
    coverageLabel: summarizeCoverage(coverage, assignments.length),
    coverage,
    days,
  }
}

export async function createRoster(input: CreateRosterInput) {
  const membership = await requireRosterAccess(permissions.rosterCreate)
  await assertOwnedDepartment(db.orm, membership.organizationId, input.departmentId)

  try {
    return await db.transaction(async (tx: TxClient) => {
      const created = await tx.orm.public.Roster.create({
        organizationId: membership.organizationId,
        departmentId: input.departmentId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        status: "DRAFT",
        createdByUserId: membership.userId,
      })

      await recordUserAudit(tx, membership, {
        action: "ROSTER_CREATED",
        entityType: "ROSTER",
        entityId: String(created.id),
        summary: `Created roster ${quoteAuditName(String(created.name))}.`,
        metadata: {
          after: {
            name: created.name,
            startDate: created.startDate,
            endDate: created.endDate,
            departmentId: created.departmentId,
            status: created.status,
          },
        },
      })

      return created
    })
  } catch {
    throw rosterError("FAILED")
  }
}

export async function updateRoster(input: UpdateRosterInput) {
  const membership = await requireRosterAccess(permissions.rosterEdit)
  const existing = await findOwnedRoster(db.orm, membership.organizationId, input.id)

  if (!existing) {
    throw rosterError("ROSTER_NOT_FOUND")
  }

  if (existing.status !== "DRAFT") {
    throw rosterError("ROSTER_NOT_DRAFT")
  }

  await assertOwnedDepartment(db.orm, membership.organizationId, existing.departmentId)

  const assignments = await db.orm.public.ShiftAssignment.where({
    organizationId: membership.organizationId,
    rosterId: existing.id,
  }).all()

  const outside = assignments.find(
    (assignment) => !isDateInInclusiveRange(assignment.date, input.startDate, input.endDate),
  )

  if (outside) {
    throw rosterError("ASSIGNMENT_OUTSIDE_ROSTER")
  }

  const updated = await db.transaction(async (tx: TxClient) => {
    const next = await tx.orm.public.Roster.where({
      id: existing.id,
      organizationId: membership.organizationId,
    }).update({
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
    })

    if (!next) {
      throw rosterError("ROSTER_NOT_FOUND")
    }

    await recordUserAudit(tx, membership, {
      action: "ROSTER_UPDATED",
      entityType: "ROSTER",
      entityId: String(next.id),
      summary: `Updated roster ${quoteAuditName(String(next.name))}.`,
      metadata: {
        changedFields: ["name", "startDate", "endDate"],
        before: {
          name: existing.name,
          startDate: existing.startDate,
          endDate: existing.endDate,
        },
        after: {
          name: next.name,
          startDate: next.startDate,
          endDate: next.endDate,
        },
      },
    })

    return next
  })

  if (!updated) {
    throw rosterError("ROSTER_NOT_FOUND")
  }

  return updated
}

export type CoverageCellView = CoverageCell
