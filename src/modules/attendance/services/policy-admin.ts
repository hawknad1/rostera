import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { permissions } from "@/lib/permissions/permissions"
import { attendanceError, isAttendanceError } from "@/modules/attendance/errors"
import { ensureDefaultAttendancePolicy, toAttendancePolicyRecord } from "@/modules/attendance/services/policy"
import type { AttendancePolicyValues } from "@/modules/attendance/types/attendance"
import { recordUserAudit } from "@/modules/audit/services/record"
import { db } from "@/prisma/db"

export async function getAttendancePolicy() {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw attendanceError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permissions.settingsView)

  if (!authorized) {
    throw attendanceError("FORBIDDEN")
  }

  return ensureDefaultAttendancePolicy(db.orm, membership.organizationId)
}

export async function updateAttendancePolicy(input: AttendancePolicyValues) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw attendanceError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permissions.settingsEdit)

  if (!authorized) {
    throw attendanceError("FORBIDDEN")
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const current = await ensureDefaultAttendancePolicy(tx.orm, membership.organizationId)
      const row = await tx.orm.public.OrganizationAttendancePolicy.where({
        id: current.id,
        organizationId: membership.organizationId,
      }).update({
        attendanceEnabled: input.attendanceEnabled,
        lateThresholdMinutes: input.lateThresholdMinutes,
        earlyDepartureThresholdMinutes: input.earlyDepartureThresholdMinutes,
        overtimeThresholdMinutes: input.overtimeThresholdMinutes,
        allowUnscheduledAttendance: input.allowUnscheduledAttendance,
        allowEarlyClockIn: input.allowEarlyClockIn,
        maximumEarlyClockInMinutes: input.maximumEarlyClockInMinutes,
        maximumLateClockOutMinutes: input.maximumLateClockOutMinutes,
      })

      if (!row) {
        throw attendanceError("FAILED")
      }

      await recordUserAudit(tx, membership, {
        action: "ATTENDANCE_POLICY_UPDATED",
        entityType: "ATTENDANCE_POLICY",
        entityId: current.id,
        summary: "Updated attendance policy.",
        metadata: { after: input },
      })

      return toAttendancePolicyRecord(row)
    })

    return updated
  } catch (error) {
    if (isAttendanceError(error)) {
      throw error
    }

    throw attendanceError("FAILED")
  }
}
