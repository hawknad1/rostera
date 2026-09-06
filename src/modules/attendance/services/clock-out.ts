import { Temporal } from "temporal-polyfill"

import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { permissions } from "@/lib/permissions/permissions"
import { recordUserAudit } from "@/modules/audit/services/record"
import { attendanceError, isAttendanceError } from "@/modules/attendance/errors"
import { requireClockStaff } from "@/modules/attendance/services/access"
import {
  AttendanceCalculationError,
  calculateAttendance,
  recordStatusFromCalculation,
} from "@/modules/attendance/services/calculations"
import { replaceOpenExceptions } from "@/modules/attendance/services/exceptions"
import { snapshotFields } from "@/modules/attendance/services/map"
import { hasApprovedLeaveCoveringDate } from "@/modules/attendance/services/match"
import { ensureDefaultAttendancePolicy } from "@/modules/attendance/services/policy"
import { getAttendance } from "@/modules/attendance/services/records"
import { asInstant } from "@/modules/attendance/services/time"
import type { TxClient } from "@/modules/attendance/types/orm"
import { db } from "@/prisma/db"

export async function clockOut(now: Temporal.Instant = Temporal.Now.instant()) {
  const identity = await requireClockStaff(permissions.attendanceClockOut)
  const membership = identity.membership
  const organizationId = membership.organizationId
  const staffId = identity.staff.id
  const policy = await ensureDefaultAttendancePolicy(db.orm, organizationId)

  if (!policy.attendanceEnabled) {
    throw attendanceError("ATTENDANCE_DISABLED")
  }

  const open = (
    await db.orm.public.AttendanceRecord.where({
      organizationId,
      staffId,
      status: "OPEN",
    }).all()
  ).find(
    (row) =>
      String(row.organizationId) === organizationId &&
      String(row.staffId) === staffId &&
      String(row.status) === "OPEN",
  )

  if (!open) {
    throw attendanceError("NO_OPEN_ATTENDANCE")
  }

  if (String(open.status) === "VOIDED") {
    throw attendanceError("ATTENDANCE_ALREADY_VOIDED")
  }

  const clockIn = asInstant(open.actualClockInDateTime)
  if (!clockIn) {
    throw attendanceError("CLOCK_OUT_NOT_ALLOWED")
  }

  const scheduledStart = asInstant(open.scheduledStartDateTime)
  const scheduledEnd = asInstant(open.scheduledEndDateTime)
  const onApprovedLeave = await hasApprovedLeaveCoveringDate({
    orm: db.orm,
    organizationId,
    staffId,
    date: String(open.attendanceDate),
  })

  let calculation
  try {
    calculation = calculateAttendance({
      scheduledStart,
      scheduledEnd,
      clockIn,
      clockOut: now,
      policy,
      unscheduled: !scheduledStart || !scheduledEnd,
      onApprovedLeave,
    })
  } catch (error) {
    if (error instanceof AttendanceCalculationError) {
      throw attendanceError("INVALID_CLOCK_ORDER")
    }

    throw error
  }

  const nextStatus = recordStatusFromCalculation({
    clockIn,
    clockOut: now,
    corrected: false,
    hasOpenExceptions: calculation.exceptions.length > 0,
  })

  try {
    await db.transaction(async (tx: TxClient) => {
      const current = await tx.orm.public.AttendanceRecord.where({
        id: String(open.id),
        organizationId,
      }).first()

      if (!current || String(current.status) !== "OPEN") {
        throw attendanceError("NO_OPEN_ATTENDANCE")
      }

      await tx.orm.public.AttendanceEvent.create({
        organizationId,
        attendanceRecordId: String(open.id),
        staffId,
        type: "CLOCK_OUT",
        punchKey: "CLOCK_OUT",
        occurredAt: now,
        source: "STAFF_PWA",
        actorUserId: membership.userId,
      })

      await tx.orm.public.AttendanceRecord.where({
        id: String(open.id),
        organizationId,
      }).update({
        actualClockOutDateTime: now,
        status: nextStatus,
        openSessionKey: null,
        ...snapshotFields(calculation),
      })

      await replaceOpenExceptions(tx, {
        organizationId,
        attendanceRecordId: String(open.id),
        staffId,
        exceptions: calculation.exceptions,
        actorUserId: membership.userId,
        now,
      })

      await recordUserAudit(tx, membership, {
        action: "ATTENDANCE_CLOCKED_OUT",
        entityType: "ATTENDANCE",
        entityId: String(open.id),
        summary: "Clocked out.",
        metadata: {
          after: {
            staffId,
            occurredAt: now.toString(),
            actualMinutes: calculation.actualMinutes,
          },
        },
      })
    })

    return getAttendance(String(open.id))
  } catch (error) {
    if (isAttendanceError(error)) {
      throw error
    }

    if (isUniqueConstraintViolation(error)) {
      throw attendanceError("NO_OPEN_ATTENDANCE")
    }

    throw attendanceError("FAILED")
  }
}
