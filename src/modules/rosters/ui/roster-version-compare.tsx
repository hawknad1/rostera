import { formatDisplayDate } from "@/lib/dates/calendar-date"
import type { RosterVersionComparison } from "@/modules/rosters/services/compare"

function AssignmentLine({
  assignment,
}: {
  assignment: RosterVersionComparison["added"][number]
}) {
  return (
    <li className="text-sm">
      {formatDisplayDate(assignment.date)} · {assignment.shiftTypeName} · {assignment.staffName} ·{" "}
      {assignment.timeLabel}
    </li>
  )
}

export function RosterVersionCompare({ comparison }: { comparison: RosterVersionComparison }) {
  const hasChanges =
    comparison.added.length > 0 || comparison.removed.length > 0 || comparison.changed.length > 0

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Compare with previous version</h2>
      <p className="text-sm text-muted-foreground">
        Version {comparison.currentVersion} compared with published version {comparison.previousVersion}.
        {comparison.unchangedCount > 0
          ? ` ${comparison.unchangedCount} ${
              comparison.unchangedCount === 1 ? "assignment is" : "assignments are"
            } unchanged.`
          : null}
      </p>
      {!hasChanges ? (
        <p className="text-sm text-muted-foreground">No assignment differences from the previous version.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Added</h3>
            {comparison.added.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {comparison.added.map((assignment) => (
                  <AssignmentLine assignment={assignment} key={assignment.id} />
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Removed</h3>
            {comparison.removed.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {comparison.removed.map((assignment) => (
                  <AssignmentLine assignment={assignment} key={assignment.id} />
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Changed</h3>
            {comparison.changed.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {comparison.changed.map((change) => (
                  <li className="text-sm" key={`${change.previous.id}-${change.current.id}`}>
                    <p>
                      {formatDisplayDate(change.current.date)} · {change.current.shiftTypeName}
                    </p>
                    <p className="text-muted-foreground">
                      {change.previous.staffName} → {change.current.staffName}
                      {change.changedFields.includes("shift")
                        ? ` · ${change.previous.shiftTypeName} → ${change.current.shiftTypeName}`
                        : null}
                      {change.changedFields.includes("time")
                        ? ` · ${change.previous.timeLabel} → ${change.current.timeLabel}`
                        : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
