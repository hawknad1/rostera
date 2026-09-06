import { Temporal } from "temporal-polyfill"

import { permissions } from "@/lib/permissions/permissions"
import { recordUserAudit } from "@/modules/audit/services/record"
import { attendanceError, isAttendanceError } from "@/modules/attendance/errors"
import { requireAttendanceAccess } from "@/modules/attendance/services/access"
import {
  AttendanceCalculationError,
  calculateAttendance,
} from "@/modules/attendance/services/calculations"
import { replaceOpenExceptions } from "@/modules/attendance/services/exceptions"
import { snapshotFields } from "@/modules/attendance/services/map"
import { hasApprovedLeaveCoveringDate } from "@/modules/attendance/services/match"
import { ensureDefaultAttendancePolicy } from "@/modules/attendance/services/policy"
import { getAttendance } from "@/modules/attendance/services/records"
import { asInstant } from "@/modules/attendance/services/time"
import type { CorrectAttendanceInput, ReviewAttendanceInput } from "@/modules/attendance/schemas/corrections"
import type { TxClient } from "@/modules/attendance/types/orm"
import {
  enqueueDomainNotification,
  processDomainNotification,
} from "@/modules/notifications/services/emit"
import { db } from "@/prisma/db"

async function notifyAttendance(
  organizationId: string,
  type: "ATTENDANCE_CORRECTED" | "ATTENDANCE_APPROVED" | "ATTENDANCE_REJECTED",
  eventId: string,
  actorUserId: string,
  staffId: string,
) {
  await processDomainNotification({
    organizationId,
    type,
    eventId,
  })
  void actorUserId
  void staffId
}

export async function correctAttendance(input: CorrectAttendanceInput) {
  const membership = await requireAttendanceAccess(permissions.attendanceCorrect)
  const organizationId = membership.organizationId
  const reason = input.reason.trim()

  if (!reason) {
    throw attendanceError("CORRECTION_REASON_REQUIRED")
  }

  const policy = await ensureDefaultAttendancePolicy(db.orm, organizationId)
  const now = Temporal.Now.instant()

  try {
    const updated = await db.transaction(async (tx: TxClient) => {
      const existing = await tx.orm.public.AttendanceRecord.where({
        id: input.id,
        organizationId,
      }).first()

      if (!existing || String(existing.organizationId) !== organizationId) {
        throw attendanceError("ATTENDANCE_NOT_FOUND")
      }

      if (String(existing.status) === "VOIDED") {
        throw attendanceError("ATTENDANCE_ALREADY_VOIDED")
      }

      const clockIn = input.clockIn ? Temporal.Instant.from(input.clockIn) : asInstant(existing.actualClockInDateTime)
      const clockOut = input.clockOut
        ? Temporal.Instant.from(input.clockOut)
        : asInstant(existing.actualClockOutDateTime)

      if (!clockIn) {
        throw attendanceError("CORRECTION_NOT_ALLOWED")
      }

      let calculation
      try {
        calculation = calculateAttendance({
          scheduledStart: asInstant(existing.scheduledStartDateTime),
          scheduledEnd: asInstant(existing.scheduledEndDateTime),
          clockIn,
          clockOut,
          policy,
          unscheduled: !existing.assignmentId,
          onApprovedLeave: await hasApprovedLeaveCoveringDate({
            orm: tx.orm,
            organizationId,
            staffId: String(existing.staffId),
            date: String(existing.attendanceDate),
          }),
        })
      } catch (error) {
        if (error instanceof AttendanceCalculationError) {
          throw attendanceError("INVALID_CLOCK_ORDER")
        }

        throw error
      }

      if (input.clockIn && !existing.actualClockInDateTime) {
        await tx.orm.public.AttendanceEvent.create({
          organizationId,
          attendanceRecordId: String(existing.id),
          staffId: String(existing.staffId),
          type: "MANUAL_CLOCK_IN",
          occurredAt: clockIn,
          source: "ADMIN",
          actorUserId: membership.userId,
          metadata: JSON.stringify({ reason }),
        })
      }

      if (input.clockOut) {
        await tx.orm.public.AttendanceEvent.create({
          organizationId,
          attendanceRecordId: String(existing.id),
          staffId: String(existing.staffId),
          type: existing.actualClockOutDateTime ? "CORRECTION" : "MANUAL_CLOCK_OUT",
          occurredAt: clockOut ?? now,
          source: "ADMIN",
          actorUserId: membership.userId,
          metadata: JSON.stringify({ reason, field: "clockOut" }),
        })
      } else if (input.clockIn && existing.actualClockInDateTime) {
        await tx.orm.public.AttendanceEvent.create({
          organizationId,
          attendanceRecordId: String(existing.id),
          staffId: String(existing.staffId),
          type: "CORRECTION",
          occurredAt: clockIn,
          source: "ADMIN",
          actorUserId: membership.userId,
          metadata: JSON.stringify({ reason, field: "clockIn" }),
        })
      }

      await tx.orm.public.AttendanceRecord.where({
        id: String(existing.id),
        organizationId,
      }).update({
        actualClockInDateTime: clockIn,
        ...(clockOut ? { actualClockOutDateTime: clockOut } : {}),
        status: clockOut ? "CORRECTED" : "OPEN",
        reviewStatus: "UNREVIEWED",
        openSessionKey: clockOut ? null : "OPEN",
        notes: reason,
        source: "ADMIN",
        ...snapshotFields(calculation),
      })

      await replaceOpenExceptions(tx, {
        organizationId,
        attendanceRecordId: String(existing.id),
        staffId: String(existing.staffId),
        exceptions: calculation.exceptions,
        actorUserId: membership.userId,
        now,
      })

      await recordUserAudit(tx, membership, {
        action: "ATTENDANCE_CORRECTED",
        entityType: "ATTENDANCE",
        entityId: String(existing.id),
        summary: "Corrected attendance.",
        metadata: {
          reason,
          after: {
            clockIn: clockIn.toString(),
            clockOut: clockOut?.toString() ?? null,
          },
        },
      })

      await enqueueDomainNotification(tx, {
        type: "ATTENDANCE_CORRECTED",
        organizationId,
        eventId: String(existing.id),
        actorUserId: membership.userId,
        staffId: String(existing.staffId),
      })

      return existing
    })

    await notifyAttendance(
      organizationId,
      "ATTENDANCE_CORRECTED",
      String(updated.id),
      membership.userId,
      String(updated.staffId),
    )

    return getAttendance(String(updated.id))
  } catch (error) {
    if (isAttendanceError(error)) {
      throw error
    }

    throw attendanceError("FAILED")
  }
}

export async function reviewAttendance(input: ReviewAttendanceInput) {
  const permission =
    input.decision === "VOID" ? permissions.attendanceCorrect : permissions.attendanceApprove
  const membership = await requireAttendanceAccess(permission)
  const organizationId = membership.organizationId
  const now = Temporal.Now.instant()

  try {
    const updated = await db.transaction(async (tx: TxClient) => {
      const existing = await tx.orm.public.AttendanceRecord.where({
        id: input.id,
        organizationId,
      }).first()

      if (!existing || String(existing.organizationId) !== organizationId) {
        throw attendanceError("ATTENDANCE_NOT_FOUND")
      }

      if (String(existing.status) === "VOIDED") {
        throw attendanceError("ATTENDANCE_ALREADY_VOIDED")
      }

      if (input.decision === "VOID") {
        await tx.orm.public.AttendanceEvent.create({
          organizationId,
          attendanceRecordId: String(existing.id),
          staffId: String(existing.staffId),
          type: "VOID",
          punchKey: "VOID",
          occurredAt: now,
          source: "ADMIN",
          actorUserId: membership.userId,
          ...(input.notes ? { metadata: JSON.stringify({ reason: input.notes }) } : {}),
        })

        await tx.orm.public.AttendanceRecord.where({
          id: String(existing.id),
          organizationId,
        }).update({
          status: "VOIDED",
          openSessionKey: null,
          ...(input.notes ? { notes: input.notes } : {}),
        })

        await recordUserAudit(tx, membership, {
          action: "ATTENDANCE_VOIDED",
          entityType: "ATTENDANCE",
          entityId: String(existing.id),
          summary: "Voided attendance.",
          metadata: input.notes ? { reason: input.notes } : undefined,
        })

        return { ...existing, decision: input.decision }
      }

      if (String(existing.status) !== "CORRECTED") {
        throw attendanceError("ATTENDANCE_NOT_REVIEWABLE")
      }

      const approved = input.decision === "APPROVE"
      await tx.orm.public.AttendanceRecord.where({
        id: String(existing.id),
        organizationId,
      }).update({
        reviewStatus: approved ? "APPROVED" : "REJECTED",
        approvedByUserId: membership.userId,
        approvedAt: now,
        ...(input.notes ? { notes: input.notes } : {}),
      })

      await recordUserAudit(tx, membership, {
        action: approved ? "ATTENDANCE_APPROVED" : "ATTENDANCE_REJECTED",
        entityType: "ATTENDANCE",
        entityId: String(existing.id),
        summary: approved ? "Approved attendance correction." : "Rejected attendance correction.",
        metadata: input.notes ? { notes: input.notes } : undefined,
      })

      await enqueueDomainNotification(tx, {
        type: approved ? "ATTENDANCE_APPROVED" : "ATTENDANCE_REJECTED",
        organizationId,
        eventId: String(existing.id),
        actorUserId: membership.userId,
        staffId: String(existing.staffId),
      })

      return { ...existing, decision: input.decision }
    })

    if (updated.decision === "APPROVE" || updated.decision === "REJECT") {
      await notifyAttendance(
        organizationId,
        updated.decision === "APPROVE" ? "ATTENDANCE_APPROVED" : "ATTENDANCE_REJECTED",
        String(updated.id),
        membership.userId,
        String(updated.staffId),
      )
    }

    return getAttendance(String(updated.id))
  } catch (error) {
    if (isAttendanceError(error)) {
      throw error
    }

    throw attendanceError("FAILED")
  }
}
