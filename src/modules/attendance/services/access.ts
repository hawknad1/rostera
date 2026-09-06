import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import type { CurrentMembership } from "@/lib/auth/get-current-membership"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { attendanceError } from "@/modules/attendance/errors"
import { StaffAppError } from "@/modules/staff-app/errors"
import {
  requireLinkedStaff,
  requireMutableStaff,
  resolveStaffIdentity,
} from "@/modules/staff-app/services/identity"
import type { StaffIdentityLinked } from "@/modules/staff-app/types"

export async function requireAttendanceAccess(permission: Permission) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw attendanceError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permission)

  if (!authorized) {
    throw attendanceError("FORBIDDEN")
  }

  return membership
}

export async function requireClockStaff(permission: Permission): Promise<StaffIdentityLinked> {
  let identity: StaffIdentityLinked

  try {
    identity = await requireMutableStaff()
  } catch (error) {
    if (error instanceof StaffAppError) {
      if (error.code === "UNAUTHENTICATED") {
        throw attendanceError("UNAUTHENTICATED")
      }

      if (error.code === "STAFF_NOT_LINKED") {
        throw attendanceError("STAFF_NOT_LINKED")
      }

      throw attendanceError("STAFF_INACTIVE")
    }

    throw error
  }

  const authorized = await hasPermission(identity.membership, permission)

  if (!authorized) {
    throw attendanceError("FORBIDDEN")
  }

  return identity
}

export async function linkedStaffIdForMembership(membership: CurrentMembership) {
  const identity = await resolveStaffIdentity()

  if (identity.status !== "LINKED") {
    return null
  }

  if (identity.membership.organizationId !== membership.organizationId) {
    return null
  }

  return identity.staff.id
}

export async function isSelfScopedAttendanceView(membership: CurrentMembership) {
  const [canView, canCorrect, canApprove, canExport] = await Promise.all([
    hasPermission(membership, permissions.attendanceView),
    hasPermission(membership, permissions.attendanceCorrect),
    hasPermission(membership, permissions.attendanceApprove),
    hasPermission(membership, permissions.attendanceExport),
  ])

  return canView && !canCorrect && !canApprove && !canExport
}

export async function requireLinkedStaffForSelfView() {
  try {
    return await requireLinkedStaff()
  } catch (error) {
    if (error instanceof StaffAppError && error.code === "UNAUTHENTICATED") {
      throw attendanceError("UNAUTHENTICATED")
    }

    if (error instanceof StaffAppError && error.code === "STAFF_NOT_LINKED") {
      throw attendanceError("STAFF_NOT_LINKED")
    }

    throw error
  }
}
