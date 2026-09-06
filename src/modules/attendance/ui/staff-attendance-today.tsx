import { formatInstantTime, formatMinutes } from "@/modules/attendance/services/time"
import { calmExceptionCopy } from "@/modules/attendance/labels"
import { StaffClockButtons } from "@/modules/attendance/ui/staff-clock-buttons"
import type { StaffAttendanceTodayView } from "@/modules/attendance/types/attendance"

export function StaffAttendanceToday({
  today,
  canMutate,
  timeZone,
}: {
  today: StaffAttendanceTodayView
  canMutate: boolean
  timeZone: string
}) {
  const openExceptions =
    today.record?.exceptions.filter((exception) => exception.status === "OPEN") ?? []

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Today</h2>
        {today.status === "NOT_CLOCKED_IN" ? (
          <p className="text-lg font-semibold tracking-tight">Not clocked in</p>
        ) : null}
        {today.status === "CLOCKED_IN" ? (
          <p className="text-lg font-semibold tracking-tight">Clocked in</p>
        ) : null}
        {today.status === "CLOCKED_OUT" ? (
          <p className="text-lg font-semibold tracking-tight">Completed</p>
        ) : null}
        {today.record?.actualClockInDateTime ? (
          <p className="text-sm text-muted-foreground">
            {today.record.scheduledStartTime
              ? null
              : null}
            Clocked in at {formatInstantTime(today.record.actualClockInDateTime, timeZone)}
            {today.elapsedMinutes != null ? ` · ${formatMinutes(today.elapsedMinutes)} elapsed` : ""}
            {today.record.actualClockOutDateTime
              ? ` → ${formatInstantTime(today.record.actualClockOutDateTime, timeZone)}`
              : ""}
          </p>
        ) : null}
        {today.status === "CLOCKED_OUT" && today.record ? (
          <p className="text-sm text-muted-foreground">
            Actual: {formatMinutes(today.record.actualMinutes)}
          </p>
        ) : null}
      </section>

      {today.planned ? (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-muted-foreground">Planned shift</h2>
          <p className="text-base font-medium">{today.planned.timeLabel}</p>
          <p className="text-sm text-muted-foreground">
            {today.planned.shiftTypeName} · {today.planned.departmentName}
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-muted-foreground">Planned shift</h2>
          <p className="text-sm text-muted-foreground">No published shift covering now.</p>
        </section>
      )}

      {openExceptions.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {openExceptions.map((exception) => (
            <li key={exception.id}>
              {calmExceptionCopy(
                exception.type,
                exception.type === "LATE_ARRIVAL"
                  ? today.record?.lateMinutes
                  : exception.type === "EARLY_DEPARTURE"
                    ? today.record?.earlyDepartureMinutes
                    : exception.type === "OVERTIME"
                      ? today.record?.overtimeMinutes
                      : undefined,
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {canMutate ? (
        <StaffClockButtons
          canClockIn={today.status !== "CLOCKED_IN"}
          canClockOut={today.status === "CLOCKED_IN"}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Clock-in is unavailable for this staff profile.</p>
      )}
    </div>
  )
}
