import { hasPermission } from "@/lib/auth/has-permission"
import { permissions } from "@/lib/permissions/permissions"
import { requireAttendanceAccess } from "@/modules/attendance/services/access"

export async function getAttendanceCapabilities() {
  const membership = await requireAttendanceAccess(permissions.attendanceView)
  const [canCorrect, canApprove, canExport, canEditPolicy] = await Promise.all([
    hasPermission(membership, permissions.attendanceCorrect),
    hasPermission(membership, permissions.attendanceApprove),
    hasPermission(membership, permissions.attendanceExport),
    hasPermission(membership, permissions.settingsEdit),
  ])

  return {
    organizationId: membership.organizationId,
    timeZone: String(membership.organization.timezone),
    canCorrect,
    canApprove,
    canExport,
    canEditPolicy,
  }
}
