import Link from "next/link"

import { formatMinutes } from "@/modules/attendance/services/time"
import { attendanceExceptionLabels, attendanceStatusLabels } from "@/modules/attendance/labels"
import type { AttendanceRecordView } from "@/modules/attendance/types/attendance"
import { formatInstantDateTime } from "@/modules/attendance/services/time"

export function AttendanceTable({
  rows,
  timeZone,
}: {
  rows: AttendanceRecordView[]
  timeZone: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No attendance records for this date.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Staff</th>
            <th className="py-2 pr-3 font-medium">Department</th>
            <th className="py-2 pr-3 font-medium">Scheduled</th>
            <th className="py-2 pr-3 font-medium">Clock in</th>
            <th className="py-2 pr-3 font-medium">Clock out</th>
            <th className="py-2 pr-3 font-medium">Actual</th>
            <th className="py-2 pr-3 font-medium">Late</th>
            <th className="py-2 pr-3 font-medium">Early</th>
            <th className="py-2 pr-3 font-medium">Overtime</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 font-medium">Exceptions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-border last:border-b-0" key={row.id}>
              <td className="py-2 pr-3">
                <Link className="font-medium underline-offset-4 hover:underline" href={`/attendance/${row.id}`}>
                  {row.staffName}
                </Link>
              </td>
              <td className="py-2 pr-3">{row.departmentName}</td>
              <td className="py-2 pr-3">
                {row.scheduledStartTime && row.scheduledEndTime
                  ? `${row.scheduledStartTime} – ${row.scheduledEndTime}`
                  : "Unscheduled"}
              </td>
              <td className="py-2 pr-3">{formatInstantDateTime(row.actualClockInDateTime, timeZone) ?? "—"}</td>
              <td className="py-2 pr-3">{formatInstantDateTime(row.actualClockOutDateTime, timeZone) ?? "—"}</td>
              <td className="py-2 pr-3">{formatMinutes(row.actualMinutes)}</td>
              <td className="py-2 pr-3">{formatMinutes(row.lateMinutes)}</td>
              <td className="py-2 pr-3">{formatMinutes(row.earlyDepartureMinutes)}</td>
              <td className="py-2 pr-3">{formatMinutes(row.overtimeMinutes)}</td>
              <td className="py-2 pr-3">{attendanceStatusLabels[row.status]}</td>
              <td className="py-2">
                {row.exceptions.filter((exception) => exception.status === "OPEN").length === 0
                  ? "—"
                  : row.exceptions
                      .filter((exception) => exception.status === "OPEN")
                      .map((exception) => attendanceExceptionLabels[exception.type])
                      .join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
