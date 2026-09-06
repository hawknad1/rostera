import { Temporal } from "temporal-polyfill"

import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { permissions } from "@/lib/permissions/permissions"
import { recordUserAudit } from "@/modules/audit/services/record"
import { attendanceError, isAttendanceError } from "@/modules/attendance/errors"
import { requireClockStaff } from "@/modules/attendance/services/access"
import {
  calculateAttendance,
  recordStatusFromCalculation,
} from "@/modules/attendance/services/calculations"
import { replaceOpenExceptions } from "@/modules/attendance/services/exceptions"
import { snapshotFields } from "@/modules/attendance/services/map"
import {
  findMatchingPublishedAssignment,
  hasApprovedLeaveCoveringDate,
} from "@/modules/attendance/services/match"
import { ensureDefaultAttendancePolicy } from "@/modules/attendance/services/policy"
import { getAttendance } from "@/modules/attendance/services/records"
import { OPEN_SESSION_KEY } from "@/modules/attendance/types/attendance"
import type { TxClient } from "@/modules/attendance/types/orm"
import { todayInTimeZone } from "@/modules/staff-app/format"
import { db } from "@/prisma/db"

export async function clockIn(now: Temporal.Instant = Temporal.Now.instant()) {
  const identity = await requireClockStaff(permissions.attendanceClockIn)
  const membership = identity.membership
  const organizationId = membership.organizationId
  const staffId = identity.staff.id
  const timeZone = identity.timeZone
  const policy = await ensureDefaultAttendancePolicy(db.orm, organizationId)

  if (!policy.attendanceEnabled) {
    throw attendanceError("ATTENDANCE_DISABLED")
  }

  const existingOpen = await db.orm.public.AttendanceRecord.where({
    organizationId,
    staffId,
    status: "OPEN",
  }).first()

  if (existingOpen && String(existingOpen.organizationId) === organizationId) {
    throw attendanceError("ALREADY_CLOCKED_IN")
  }

  const match = await findMatchingPublishedAssignment({
    orm: db.orm,
    organizationId,
    staffId,
    now,
    policy,
  })

  if (!match && !policy.allowUnscheduledAttendance) {
    throw attendanceError("UNSCHEDULED_NOT_ALLOWED")
  }

  const attendanceDate = match ? match.date : todayInTimeZone(timeZone, now)
  const onApprovedLeave = await hasApprovedLeaveCoveringDate({
    orm: db.orm,
    organizationId,
    staffId,
    date: attendanceDate,
  })

  const calculation = calculateAttendance({
    scheduledStart: match?.start ?? null,
    scheduledEnd: match?.end ?? null,
    clockIn: now,
    clockOut: null,
    policy,
    unscheduled: !match,
    onApprovedLeave,
  })

  try {
    const created = await db.transaction(async (tx: TxClient) => {
      const record = await tx.orm.public.AttendanceRecord.create({
        organizationId,
        staffId,
        attendanceDate,
        status: "OPEN",
        reviewStatus: "UNREVIEWED",
        source: "STAFF_PWA",
        openSessionKey: OPEN_SESSION_KEY,
        actualClockInDateTime: now,
        ...snapshotFields(calculation),
        ...(match
          ? {
              rosterId: match.rosterId,
              assignmentId: match.id,
              scheduledStartDateTime: match.start,
              scheduledEndDateTime: match.end,
            }
          : {}),
      })

      await tx.orm.public.AttendanceEvent.create({
        organizationId,
        attendanceRecordId: String(record.id),
        staffId,
        type: "CLOCK_IN",
        punchKey: "CLOCK_IN",
        occurredAt: now,
        source: "STAFF_PWA",
        actorUserId: membership.userId,
      })

      await replaceOpenExceptions(tx, {
        organizationId,
        attendanceRecordId: String(record.id),
        staffId,
        exceptions: calculation.exceptions,
        actorUserId: membership.userId,
        now,
      })

      const status = recordStatusFromCalculation({
        clockIn: now,
        clockOut: null,
        corrected: false,
        hasOpenExceptions: calculation.exceptions.length > 0,
      })

      if (status !== "OPEN") {
        await tx.orm.public.AttendanceRecord.where({
          id: String(record.id),
          organizationId,
        }).update({ status })
      }

      await recordUserAudit(tx, membership, {
        action: "ATTENDANCE_CLOCKED_IN",
        entityType: "ATTENDANCE",
        entityId: String(record.id),
        summary: "Clocked in.",
        metadata: {
          after: {
            staffId,
            attendanceDate,
            assignmentId: match?.id ?? null,
            occurredAt: now.toString(),
          },
        },
      })

      return record
    })

    return getAttendance(String(created.id))
  } catch (error) {
    if (isAttendanceError(error)) {
      throw error
    }

    if (isUniqueConstraintViolation(error)) {
      throw attendanceError("ALREADY_CLOCKED_IN")
    }

    throw attendanceError("FAILED")
  }
}
