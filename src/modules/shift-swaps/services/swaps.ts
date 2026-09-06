import { hasPermission } from "@/lib/auth/has-permission"
import { formatDisplayDate } from "@/lib/dates/calendar-date"
import { permissions } from "@/lib/permissions/permissions"
import { formatStaffName } from "@/modules/staff/labels"
import { swapError } from "@/modules/shift-swaps/errors"
import { type SwapStatus } from "@/modules/shift-swaps/labels"
import {
  actorLabel,
  asSwapStatus,
  findLinkedStaff,
  findOwnedSwap,
  formatTimeLabel,
  isStaffSelfService,
  loadPendingSwapsForAssignments,
  requireSwapAccess,
  type PublicOrm,
} from "@/modules/shift-swaps/services/access"
import { simulateSwapAssignments } from "@/modules/shift-swaps/services/validation"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import { db } from "@/prisma/db"

export type SwapListItem = {
  id: string
  organizationId: string
  rosterId: string
  departmentId: string
  departmentName: string
  rosterName: string
  status: SwapStatus
  requesterStaffId: string
  requesterName: string
  targetStaffId: string
  targetStaffName: string
  sourceAssignmentId: string
  targetAssignmentId: string
  sourceDate: string
  sourceDateLabel: string
  sourceShiftName: string
  sourceTimeLabel: string
  targetDate: string
  targetDateLabel: string
  targetShiftName: string
  targetTimeLabel: string
  reason: string | null
  reviewNotes: string | null
  requestedByUserId: string
  requestedByLabel: string
  reviewedByUserId: string | null
  reviewedByLabel: string | null
  reviewedAt: unknown
  completedAt: unknown
  createdAt: unknown
  updatedAt: unknown
}

export type SwapDetail = SwapListItem & {
  blockers: SchedulingConflict[]
  warnings: SchedulingConflict[]
}

function sortSwaps(rows: SwapListItem[]) {
  return [...rows].sort((left, right) => {
    const created = String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""))
    if (created !== 0) {
      return created
    }

    return left.requesterName.localeCompare(right.requesterName)
  })
}

async function loadProfessionAndShiftMaps(orm: PublicOrm, organizationId: string) {
  const [globalProfessions, orgProfessions, shiftTypes, departments, rosters] = await Promise.all([
    orm.public.Profession.where({ organizationId: null }).all(),
    orm.public.Profession.where({ organizationId }).all(),
    orm.public.ShiftType.where({ organizationId }).all(),
    orm.public.Department.where({ organizationId }).all(),
    orm.public.Roster.where({ organizationId }).all(),
  ])

  return {
    shiftTypes: new Map(shiftTypes.map((shiftType) => [shiftType.id, shiftType])),
    departments: new Map(departments.map((department) => [department.id, department])),
    rosters: new Map(rosters.map((roster) => [roster.id, roster])),
    professions: new Map(
      [...globalProfessions, ...orgProfessions].map((profession) => [profession.id, profession]),
    ),
  }
}

async function hydrateSwapRows(
  orm: PublicOrm,
  organizationId: string,
  rows: Array<{
    id: string
    organizationId: string
    rosterId: string
    departmentId: string
    sourceAssignmentId: string
    targetAssignmentId: string
    requesterStaffId: string
    targetStaffId: string
    status: string
    reason?: string | null
    reviewNotes?: string | null
    requestedByUserId: string
    reviewedByUserId?: string | null
    reviewedAt?: unknown
    completedAt?: unknown
    createdAt: unknown
    updatedAt?: unknown
  }>,
): Promise<SwapListItem[]> {
  const tenantRows = rows.filter((row) => row.organizationId === organizationId)
  const staffIds = [
    ...new Set(tenantRows.flatMap((row) => [row.requesterStaffId, row.targetStaffId])),
  ]
  const assignmentIds = [
    ...new Set(tenantRows.flatMap((row) => [row.sourceAssignmentId, row.targetAssignmentId])),
  ]
  const userIds = [
    ...new Set(
      tenantRows.flatMap((row) =>
        [row.requestedByUserId, row.reviewedByUserId].filter((id): id is string => Boolean(id)),
      ),
    ),
  ]

  const [staffRows, assignmentRows, userRows, maps] = await Promise.all([
    Promise.all(
      staffIds.map((staffId) =>
        orm.public.StaffProfile.where({ id: staffId, organizationId }).first(),
      ),
    ),
    Promise.all(
      assignmentIds.map((assignmentId) =>
        orm.public.ShiftAssignment.where({ id: assignmentId, organizationId }).first(),
      ),
    ),
    Promise.all(userIds.map((userId) => orm.public.User.where({ id: userId }).first())),
    loadProfessionAndShiftMaps(orm, organizationId),
  ])

  const staffById = new Map(staffRows.filter(Boolean).map((staff) => [staff!.id, staff!]))
  const assignmentsById = new Map(
    assignmentRows.filter(Boolean).map((assignment) => [assignment!.id, assignment!]),
  )
  const usersById = new Map(userRows.filter(Boolean).map((user) => [user!.id, user!]))

  return sortSwaps(
    tenantRows.map((row) => {
      const source = assignmentsById.get(row.sourceAssignmentId)
      const target = assignmentsById.get(row.targetAssignmentId)
      const requester = staffById.get(row.requesterStaffId)
      const targetStaff = staffById.get(row.targetStaffId)
      const department = maps.departments.get(row.departmentId)
      const roster = maps.rosters.get(row.rosterId)
      const sourceShift = source ? maps.shiftTypes.get(source.shiftTypeId) : undefined
      const targetShift = target ? maps.shiftTypes.get(target.shiftTypeId) : undefined

      return {
        id: row.id,
        organizationId: row.organizationId,
        rosterId: row.rosterId,
        departmentId: row.departmentId,
        departmentName: department?.name ?? "Unknown department",
        rosterName: roster?.name ?? "Unknown roster",
        status: asSwapStatus(row.status),
        requesterStaffId: row.requesterStaffId,
        requesterName: requester ? formatStaffName(requester) : "Unknown staff",
        targetStaffId: row.targetStaffId,
        targetStaffName: targetStaff ? formatStaffName(targetStaff) : "Unknown staff",
        sourceAssignmentId: row.sourceAssignmentId,
        targetAssignmentId: row.targetAssignmentId,
        sourceDate: source?.date ?? "",
        sourceDateLabel: source ? formatDisplayDate(source.date) : "Unknown date",
        sourceShiftName: sourceShift?.name ?? "Unknown shift",
        sourceTimeLabel: source ? formatTimeLabel(source) : "",
        targetDate: target?.date ?? "",
        targetDateLabel: target ? formatDisplayDate(target.date) : "Unknown date",
        targetShiftName: targetShift?.name ?? "Unknown shift",
        targetTimeLabel: target ? formatTimeLabel(target) : "",
        reason: row.reason ?? null,
        reviewNotes: row.reviewNotes ?? null,
        requestedByUserId: row.requestedByUserId,
        requestedByLabel: actorLabel(usersById.get(row.requestedByUserId) ?? null),
        reviewedByUserId: row.reviewedByUserId ?? null,
        reviewedByLabel: row.reviewedByUserId
          ? actorLabel(usersById.get(row.reviewedByUserId) ?? null)
          : null,
        reviewedAt: row.reviewedAt ?? null,
        completedAt: row.completedAt ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt ?? row.createdAt,
      }
    }),
  )
}

export async function getSwapCapabilities() {
  const membership = await requireSwapAccess(permissions.shiftSwapView)
  const [canRequest, canApprove, canReject, selfService] = await Promise.all([
    hasPermission(membership, permissions.shiftSwapRequest),
    hasPermission(membership, permissions.shiftSwapApprove),
    hasPermission(membership, permissions.shiftSwapReject),
    isStaffSelfService(membership),
  ])

  const linkedStaff = await findLinkedStaff(db.orm, membership.organizationId, membership.userId)

  return {
    canRequest,
    canApprove,
    canReject,
    isStaffSelfService: selfService,
    ownStaffId: linkedStaff?.id ?? null,
  }
}

export async function listSwaps() {
  const membership = await requireSwapAccess(permissions.shiftSwapView)
  const organizationId = membership.organizationId
  const selfService = await isStaffSelfService(membership)
  const rows = await db.orm.public.ShiftSwapRequest.where({ organizationId }).all()
  const tenantRows = rows.filter((row) => row.organizationId === organizationId)

  if (!selfService) {
    return hydrateSwapRows(db.orm, organizationId, tenantRows)
  }

  const linkedStaff = await findLinkedStaff(db.orm, organizationId, membership.userId)

  if (!linkedStaff) {
    return []
  }

  return hydrateSwapRows(
    db.orm,
    organizationId,
    tenantRows.filter(
      (row) =>
        row.requesterStaffId === linkedStaff.id || row.targetStaffId === linkedStaff.id,
    ),
  )
}

export async function getSwap(swapId: string): Promise<SwapDetail> {
  const membership = await requireSwapAccess(permissions.shiftSwapView)
  const organizationId = membership.organizationId
  const row = await findOwnedSwap(db.orm, organizationId, swapId)

  if (!row) {
    throw swapError("SWAP_NOT_FOUND")
  }

  const selfService = await isStaffSelfService(membership)

  if (selfService) {
    const linkedStaff = await findLinkedStaff(db.orm, organizationId, membership.userId)

    if (
      !linkedStaff ||
      (linkedStaff.id !== row.requesterStaffId && linkedStaff.id !== row.targetStaffId)
    ) {
      throw swapError("SWAP_NOT_FOUND")
    }
  }

  const [hydrated] = await hydrateSwapRows(db.orm, organizationId, [row])

  if (!hydrated) {
    throw swapError("SWAP_NOT_FOUND")
  }

  let blockers: SchedulingConflict[] = []
  let warnings: SchedulingConflict[] = []

  if (asSwapStatus(row.status) === "PENDING") {
    const preview = await previewSwapValidation(organizationId, String(membership.organization.timezone), row)
    blockers = preview.blockers
    warnings = preview.warnings
  }

  return {
    ...hydrated,
    blockers,
    warnings,
  }
}

async function previewSwapValidation(
  organizationId: string,
  timeZone: string,
  row: {
    sourceAssignmentId: string
    targetAssignmentId: string
    requesterStaffId: string
    targetStaffId: string
    rosterId: string
  },
) {
  const [source, target, requester, targetStaff, roster] = await Promise.all([
    db.orm.public.ShiftAssignment.where({
      id: row.sourceAssignmentId,
      organizationId,
    }).first(),
    db.orm.public.ShiftAssignment.where({
      id: row.targetAssignmentId,
      organizationId,
    }).first(),
    db.orm.public.StaffProfile.where({
      id: row.requesterStaffId,
      organizationId,
    }).first(),
    db.orm.public.StaffProfile.where({
      id: row.targetStaffId,
      organizationId,
    }).first(),
    db.orm.public.Roster.where({
      id: row.rosterId,
      organizationId,
    }).first(),
  ])

  if (!source || !target || !requester || !targetStaff || !roster) {
    return { blockers: [], warnings: [] }
  }

  try {
    return await simulateSwapAssignments(db.orm, {
      organizationId,
      timeZone,
      roster,
      source,
      target,
      requester,
      targetStaff,
    })
  } catch {
    return { blockers: [], warnings: [] }
  }
}

export type SwapFormAssignment = {
  id: string
  date: string
  dateLabel: string
  shiftName: string
  timeLabel: string
  departmentName: string
  rosterId: string
  rosterName: string
  rosterStatus: string
}

export type SwapFormCandidate = {
  assignmentId: string
  staffId: string
  staffName: string
  staffNumber: string
  date: string
  dateLabel: string
  shiftName: string
  timeLabel: string
}

export async function listSwapFormOptions() {
  const membership = await requireSwapAccess(permissions.shiftSwapRequest)
  const organizationId = membership.organizationId
  const linkedStaff = await findLinkedStaff(db.orm, organizationId, membership.userId)

  if (!linkedStaff) {
    return {
      ownAssignments: [] as SwapFormAssignment[],
      candidatesBySourceId: {} as Record<string, SwapFormCandidate[]>,
      linked: false,
    }
  }

  const [ownRows, orgAssignments, maps, staffRows] = await Promise.all([
    db.orm.public.ShiftAssignment.where({
      organizationId,
      staffId: linkedStaff.id,
    }).all(),
    db.orm.public.ShiftAssignment.where({ organizationId }).all(),
    loadProfessionAndShiftMaps(db.orm, organizationId),
    db.orm.public.StaffProfile.where({
      organizationId,
      employmentStatus: "ACTIVE",
    }).all(),
  ])

  const ownAssignments = ownRows
    .filter((row) => row.organizationId === organizationId && row.staffId === linkedStaff.id)
    .map((assignment) => {
      const roster = maps.rosters.get(assignment.rosterId)
      const department = maps.departments.get(assignment.departmentId)
      const shiftType = maps.shiftTypes.get(assignment.shiftTypeId)

      return {
        id: assignment.id,
        date: assignment.date,
        dateLabel: formatDisplayDate(assignment.date),
        shiftName: shiftType?.name ?? "Unknown shift",
        timeLabel: formatTimeLabel(assignment),
        departmentName: department?.name ?? "Unknown department",
        rosterId: assignment.rosterId,
        rosterName: roster?.name ?? "Unknown roster",
        rosterStatus: roster?.status ?? "DRAFT",
      }
    })
    .sort((left, right) => left.date.localeCompare(right.date) || left.shiftName.localeCompare(right.shiftName))

  const pending = await loadPendingSwapsForAssignments(
    db.orm,
    organizationId,
    orgAssignments.map((assignment) => assignment.id),
  )
  const busyAssignmentIds = new Set(
    pending.flatMap((swap) => [swap.sourceAssignmentId, swap.targetAssignmentId]),
  )

  const staffById = new Map(
    staffRows
      .filter((member) => member.organizationId === organizationId)
      .map((member) => [member.id, member]),
  )

  const candidatesBySourceId: Record<string, SwapFormCandidate[]> = {}

  for (const source of ownAssignments) {
    const sourceRow = ownRows.find((row) => row.id === source.id)
    if (!sourceRow) {
      continue
    }

    candidatesBySourceId[source.id] = orgAssignments
      .filter((assignment) => {
        if (assignment.organizationId !== organizationId) {
          return false
        }

        if (assignment.id === source.id) {
          return false
        }

        if (assignment.rosterId !== source.rosterId) {
          return false
        }

        if (assignment.departmentId !== sourceRow.departmentId) {
          return false
        }

        if (assignment.staffId === linkedStaff.id) {
          return false
        }

        if (busyAssignmentIds.has(assignment.id) || busyAssignmentIds.has(source.id)) {
          return false
        }

        const member = staffById.get(assignment.staffId)
        if (!member || member.employmentStatus !== "ACTIVE") {
          return false
        }

        if (member.departmentId !== sourceRow.departmentId) {
          return false
        }

        if (member.professionId !== sourceRow.professionId) {
          return false
        }

        return true
      })
      .map((assignment) => {
        const member = staffById.get(assignment.staffId)!
        const shiftType = maps.shiftTypes.get(assignment.shiftTypeId)

        return {
          assignmentId: assignment.id,
          staffId: member.id,
          staffName: formatStaffName(member),
          staffNumber: member.staffNumber,
          date: assignment.date,
          dateLabel: formatDisplayDate(assignment.date),
          shiftName: shiftType?.name ?? "Unknown shift",
          timeLabel: formatTimeLabel(assignment),
        }
      })
      .sort(
        (left, right) =>
          left.staffName.localeCompare(right.staffName) || left.date.localeCompare(right.date),
      )
  }

  return {
    ownAssignments,
    candidatesBySourceId,
    linked: true,
  }
}
