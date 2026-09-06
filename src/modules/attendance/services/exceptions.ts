import { Temporal } from "temporal-polyfill"

import type { AttendanceExceptionCandidate } from "@/modules/attendance/types/attendance"
import type { PublicOrm, TxClient } from "@/modules/attendance/types/orm"

function exceptionType(value: unknown) {
  return String(value)
}

export async function replaceOpenExceptions(
  tx: TxClient,
  input: {
    organizationId: string
    attendanceRecordId: string
    staffId: string
    exceptions: AttendanceExceptionCandidate[]
    actorUserId?: string | null
    now?: Temporal.Instant
  },
) {
  const now = input.now ?? Temporal.Now.instant()
  const existing = await tx.orm.public.AttendanceException.where({
    organizationId: input.organizationId,
    attendanceRecordId: input.attendanceRecordId,
  }).all()

  const openRows = existing.filter(
    (row) =>
      String(row.organizationId) === input.organizationId &&
      String(row.attendanceRecordId) === input.attendanceRecordId &&
      String(row.status) === "OPEN",
  )

  for (const row of openRows) {
    await tx.orm.public.AttendanceException.where({
      id: String(row.id),
      organizationId: input.organizationId,
    }).update({
      status: "RESOLVED",
      resolvedAt: now,
      ...(input.actorUserId ? { resolvedByUserId: input.actorUserId } : {}),
    })
  }

  for (const candidate of input.exceptions) {
    await tx.orm.public.AttendanceException.create({
      organizationId: input.organizationId,
      attendanceRecordId: input.attendanceRecordId,
      staffId: input.staffId,
      type: candidate.type,
      severity: candidate.severity,
      status: "OPEN",
      detectedAt: now,
      ...(candidate.minutes != null
        ? { metadata: JSON.stringify({ minutes: candidate.minutes }) }
        : {}),
    })
  }
}

export async function loadExceptionsForRecords(
  orm: PublicOrm,
  organizationId: string,
  recordIds: string[],
) {
  if (recordIds.length === 0) {
    return []
  }

  const rows = await orm.public.AttendanceException.where({ organizationId }).all()
  const allowed = new Set(recordIds)

  return rows.filter(
    (row) =>
      String(row.organizationId) === organizationId && allowed.has(String(row.attendanceRecordId)),
  )
}

export function openExceptionTypes(rows: Array<{ type?: unknown; status?: unknown }>) {
  return rows
    .filter((row) => String(row.status) === "OPEN")
    .map((row) => exceptionType(row.type))
}
