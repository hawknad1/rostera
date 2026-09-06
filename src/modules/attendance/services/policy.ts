import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import {
  DEFAULT_ATTENDANCE_POLICY,
  type AttendancePolicyRecord,
  type AttendancePolicyValues,
} from "@/modules/attendance/types/attendance"
import type { PublicOrm } from "@/modules/attendance/types/orm"

function asBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value
  }

  return fallback
}

function asInteger(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value
  }

  return fallback
}

export function toAttendancePolicyRecord(row: {
  id: unknown
  organizationId: unknown
  attendanceEnabled?: unknown
  lateThresholdMinutes?: unknown
  earlyDepartureThresholdMinutes?: unknown
  overtimeThresholdMinutes?: unknown
  allowUnscheduledAttendance?: unknown
  allowEarlyClockIn?: unknown
  maximumEarlyClockInMinutes?: unknown
  maximumLateClockOutMinutes?: unknown
}): AttendancePolicyRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    attendanceEnabled: asBoolean(row.attendanceEnabled, DEFAULT_ATTENDANCE_POLICY.attendanceEnabled),
    lateThresholdMinutes: asInteger(
      row.lateThresholdMinutes,
      DEFAULT_ATTENDANCE_POLICY.lateThresholdMinutes,
    ),
    earlyDepartureThresholdMinutes: asInteger(
      row.earlyDepartureThresholdMinutes,
      DEFAULT_ATTENDANCE_POLICY.earlyDepartureThresholdMinutes,
    ),
    overtimeThresholdMinutes: asInteger(
      row.overtimeThresholdMinutes,
      DEFAULT_ATTENDANCE_POLICY.overtimeThresholdMinutes,
    ),
    allowUnscheduledAttendance: asBoolean(
      row.allowUnscheduledAttendance,
      DEFAULT_ATTENDANCE_POLICY.allowUnscheduledAttendance,
    ),
    allowEarlyClockIn: asBoolean(
      row.allowEarlyClockIn,
      DEFAULT_ATTENDANCE_POLICY.allowEarlyClockIn,
    ),
    maximumEarlyClockInMinutes: asInteger(
      row.maximumEarlyClockInMinutes,
      DEFAULT_ATTENDANCE_POLICY.maximumEarlyClockInMinutes,
    ),
    maximumLateClockOutMinutes: asInteger(
      row.maximumLateClockOutMinutes,
      DEFAULT_ATTENDANCE_POLICY.maximumLateClockOutMinutes,
    ),
  }
}

export const DEFAULT_ATTENDANCE_POLICY_VALUES: AttendancePolicyValues = {
  ...DEFAULT_ATTENDANCE_POLICY,
}

export async function ensureDefaultAttendancePolicy(orm: PublicOrm, organizationId: string) {
  const existing = await orm.public.OrganizationAttendancePolicy.where({
    organizationId,
  }).first()

  if (existing) {
    return toAttendancePolicyRecord(existing)
  }

  try {
    const created = await orm.public.OrganizationAttendancePolicy.create({
      organizationId,
      ...DEFAULT_ATTENDANCE_POLICY_VALUES,
    })
    return toAttendancePolicyRecord(created)
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      throw error
    }

    const raced = await orm.public.OrganizationAttendancePolicy.where({
      organizationId,
    }).first()

    if (!raced) {
      throw error
    }

    return toAttendancePolicyRecord(raced)
  }
}
