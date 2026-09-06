import Link from "next/link"

import { coverageStatusLabel, type CoverageStatus } from "@/modules/rosters/services/coverage"
import { RemoveAssignmentForm } from "@/modules/rosters/ui/remove-assignment-form"

type AssignmentItem = {
  id: string
  staffId?: string
  staffName: string
  staffNumber: string
  professionName: string
  timeLabel: string
}

type CoverageItem = {
  professionName: string
  requiredCount: number
  assignedCount: number
  shortfall: number
  surplus: number
  status: CoverageStatus
}

type ShiftGroup = {
  shiftTypeId: string
  shiftTypeName: string
  timeLabel: string
  assignments: AssignmentItem[]
  coverage: CoverageItem[]
}

function coverageCopy(cell: CoverageItem, showStatus: boolean) {
  const required = `Required ${cell.requiredCount}`
  const assigned = `Assigned ${cell.assignedCount}`
  const delta =
    cell.shortfall > 0
      ? `Short by ${cell.shortfall}`
      : cell.surplus > 0
        ? `Over by ${cell.surplus}`
        : "Met"

  if (!showStatus) {
    return `${cell.professionName} · ${required} · ${assigned}`
  }

  return `${cell.professionName} · ${required} · ${assigned} · ${delta} · ${coverageStatusLabel(cell.status)}`
}

export function RosterSchedule({
  days,
  assignmentCount,
  canEdit,
  isDraft,
  canRequestSwap,
  ownStaffId,
}: {
  days: Array<{ date: string; displayDate: string; shifts: ShiftGroup[] }>
  assignmentCount: number
  canEdit: boolean
  isDraft: boolean
  canRequestSwap?: boolean
  ownStaffId?: string | null
}) {
  const showCoverageStatus = assignmentCount > 0

  if (assignmentCount === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">No shifts assigned yet.</p>
          <p className="text-sm text-muted-foreground">
            Add staff to shifts to start building this roster.
          </p>
        </div>
        {days.map((day) => (
          <section className="flex flex-col gap-3" key={day.date}>
            <h3 className="text-base font-medium">{day.displayDate}</h3>
            {day.shifts.map((shift) => (
              <div className="flex flex-col gap-1 border-t border-border pt-3" key={shift.shiftTypeId}>
                <p className="text-sm font-medium">
                  {shift.shiftTypeName} · {shift.timeLabel}
                </p>
                {shift.coverage.length > 0 ? (
                  <ul className="text-sm text-muted-foreground">
                    {shift.coverage.map((cell) => (
                      <li key={cell.professionName}>{coverageCopy(cell, false)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No staffing requirement for this shift.</p>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => (
        <section className="flex flex-col gap-4" key={day.date}>
          <h3 className="text-base font-medium">{day.displayDate}</h3>
          {day.shifts.map((shift) => (
            <div className="flex flex-col gap-2 border-t border-border pt-3" key={shift.shiftTypeId}>
              <p className="text-sm font-medium">
                {shift.shiftTypeName} · {shift.timeLabel}
              </p>
              {shift.coverage.length > 0 ? (
                <ul className="text-sm text-muted-foreground">
                  {shift.coverage.map((cell) => (
                    <li key={cell.professionName}>{coverageCopy(cell, showCoverageStatus)}</li>
                  ))}
                </ul>
              ) : null}
              {shift.assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff assigned.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {shift.assignments.map((assignment) => (
                    <li
                      className="flex flex-wrap items-baseline justify-between gap-3 text-sm"
                      key={assignment.id}
                    >
                      <span>
                        {assignment.staffName}
                        {assignment.staffNumber ? ` · ${assignment.staffNumber}` : ""} ·{" "}
                        {assignment.professionName} · {assignment.timeLabel}
                      </span>
                      <span className="flex flex-wrap items-center gap-3">
                        {canRequestSwap && ownStaffId && assignment.staffId === ownStaffId ? (
                          <Link
                            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                            href={`/shift-swaps/new?sourceAssignmentId=${assignment.id}`}
                          >
                            Request swap
                          </Link>
                        ) : null}
                        {canEdit && isDraft ? (
                          <RemoveAssignmentForm assignmentId={assignment.id} />
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
