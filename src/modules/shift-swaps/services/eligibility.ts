import { swapError } from "@/modules/shift-swaps/errors"

type AssignmentRow = {
  id: string
  organizationId: string
  rosterId: string
  departmentId: string
  staffId: string
}

type StaffRow = {
  id: string
  organizationId: string
  departmentId: string
  professionId?: string | null
  employmentStatus: string
}

type RosterRow = {
  id: string
  organizationId: string
  status: string
}

export function assertSwapAssignmentsMatchStaff(
  source: AssignmentRow,
  target: AssignmentRow,
  requester: StaffRow,
  targetStaff: StaffRow,
) {
  if (source.staffId !== requester.id) {
    throw swapError("SWAP_NOT_YOURS")
  }

  if (target.staffId !== targetStaff.id) {
    throw swapError("SWAP_ASSIGNMENTS_MISMATCH")
  }
}

export function assertSameRoster(source: AssignmentRow, target: AssignmentRow) {
  if (source.rosterId !== target.rosterId) {
    throw swapError("SWAP_ROSTER_MISMATCH")
  }
}

export function assertSameDepartment(source: AssignmentRow, target: AssignmentRow) {
  if (source.departmentId !== target.departmentId) {
    throw swapError("SWAP_NOT_ELIGIBLE")
  }
}

export function assertDistinctStaff(requester: StaffRow, targetStaff: StaffRow) {
  if (requester.id === targetStaff.id) {
    throw swapError("SWAP_NOT_ELIGIBLE")
  }
}

export function assertStaffEligibleForSwap(staff: StaffRow, assignmentDepartmentId: string) {
  if (staff.employmentStatus !== "ACTIVE") {
    throw swapError("SWAP_STAFF_INACTIVE")
  }

  if (staff.departmentId !== assignmentDepartmentId) {
    throw swapError("SWAP_NOT_ELIGIBLE")
  }

  if (!staff.professionId) {
    throw swapError("SWAP_NOT_ELIGIBLE")
  }
}

export function assertRosterCompletable(roster: RosterRow) {
  if (roster.status === "PUBLISHED") {
    throw swapError("SWAP_REQUIRES_AMENDMENT")
  }

  if (roster.status !== "DRAFT") {
    throw swapError("SWAP_REQUIRES_DRAFT_ROSTER")
  }
}

export function assertSwapTenancy(
  organizationId: string,
  rows: Array<{ organizationId: string }>,
) {
  if (rows.some((row) => row.organizationId !== organizationId)) {
    throw swapError("SWAP_NOT_FOUND")
  }
}
