import Link from "next/link"
import { notFound } from "next/navigation"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { AttendanceError } from "@/modules/attendance/errors"
import {
  attendanceEventLabels,
  attendanceExceptionLabels,
  attendanceReviewLabels,
  attendanceStatusLabels,
  calmExceptionCopy,
} from "@/modules/attendance/labels"
import { getAttendanceCapabilities } from "@/modules/attendance/services/capabilities"
import { getAttendance } from "@/modules/attendance/services/records"
import { formatInstantDateTime, formatMinutes } from "@/modules/attendance/services/time"
import { AttendanceCorrectionForm } from "@/modules/attendance/ui/correction-form"
import { AttendanceReviewActions } from "@/modules/attendance/ui/review-actions"

export default async function AttendanceDetailPage({
  params,
}: PageProps<"/attendance/[id]">) {
  const { id } = await params
  await requirePermission(permissions.attendanceView)

  let record
  try {
    record = await getAttendance(id)
  } catch (error) {
    if (
      error instanceof AttendanceError &&
      (error.code === "ATTENDANCE_NOT_FOUND" || error.code === "UNAUTHORIZED_ATTENDANCE_ACCESS")
    ) {
      notFound()
    }
    throw error
  }

  const capabilities = await getAttendanceCapabilities()
  const canCorrect = capabilities.canCorrect && record.status !== "VOIDED"
  const canReview =
    capabilities.canApprove && record.status !== "VOIDED" && record.reviewStatus === "UNREVIEWED"

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/attendance">
          Back to attendance
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{record.staffName}</h1>
        <p className="text-sm text-muted-foreground">
          {record.attendanceDate} · {attendanceStatusLabels[record.status]} ·{" "}
          {attendanceReviewLabels[record.reviewStatus]}
        </p>
      </div>

      <section className="grid gap-6 sm:grid-cols-2">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Department</dt>
            <dd>{record.departmentName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Planned shift</dt>
            <dd>
              {record.scheduledStartTime && record.scheduledEndTime
                ? `${record.scheduledStartTime} – ${record.scheduledEndTime}${record.isOvernight ? " · overnight" : ""}`
                : "Unscheduled"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Shift type</dt>
            <dd>{record.shiftTypeName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Clock in</dt>
            <dd>{formatInstantDateTime(record.actualClockInDateTime, capabilities.timeZone) ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Clock out</dt>
            <dd>{formatInstantDateTime(record.actualClockOutDateTime, capabilities.timeZone) ?? "—"}</dd>
          </div>
        </dl>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Scheduled</dt>
            <dd>{formatMinutes(record.scheduledMinutes)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Actual</dt>
            <dd>{formatMinutes(record.actualMinutes)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Late / early / overtime</dt>
            <dd>
              {formatMinutes(record.lateMinutes)} / {formatMinutes(record.earlyDepartureMinutes)} /{" "}
              {formatMinutes(record.overtimeMinutes)}
            </dd>
          </div>
          {record.notes ? (
            <div>
              <dt className="text-muted-foreground">Notes</dt>
              <dd>{record.notes}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Timeline</h2>
        {record.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance events.</p>
        ) : (
          <ol className="flex flex-col">
            {record.events.map((event) => (
              <li className="border-b border-border py-3 last:border-b-0" key={event.id}>
                <p className="text-sm font-medium">{attendanceEventLabels[event.type]}</p>
                <p className="text-sm text-muted-foreground">
                  {formatInstantDateTime(event.occurredAt, capabilities.timeZone)} · {event.source}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Exceptions</h2>
        {record.exceptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exceptions recorded.</p>
        ) : (
          <ul className="flex flex-col">
            {record.exceptions.map((exception) => (
              <li className="border-b border-border py-3 last:border-b-0" key={exception.id}>
                <p className="text-sm font-medium">
                  {calmExceptionCopy(exception.type)} · {exception.status.toLowerCase()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {attendanceExceptionLabels[exception.type]}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canCorrect ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Correction</h2>
          <AttendanceCorrectionForm
            clockIn={record.actualClockInDateTime}
            clockOut={record.actualClockOutDateTime}
            recordId={record.id}
            timeZone={capabilities.timeZone}
          />
        </section>
      ) : null}

      {canReview || capabilities.canCorrect ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Review</h2>
          <AttendanceReviewActions
            canApprove={canReview}
            canVoid={capabilities.canCorrect && record.status !== "VOIDED"}
            recordId={record.id}
          />
        </section>
      ) : null}
    </main>
  )
}
