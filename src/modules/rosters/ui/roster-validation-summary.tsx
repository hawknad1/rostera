import type {
  SerializedRosterValidation,
  SerializedSchedulingConflict,
} from "@/modules/rosters/actions/lifecycle-state"

function coverageLine(validation: SerializedRosterValidation) {
  const { requirementCount, satisfiedCount, understaffedCount, overstaffedCount } =
    validation.coverage

  if (requirementCount === 0) {
    return overstaffedCount > 0
      ? `No staffing requirements. ${overstaffedCount} overstaffed ${
          overstaffedCount === 1 ? "cell" : "cells"
        }.`
      : "No staffing requirements for this roster."
  }

  const parts = [`${satisfiedCount} / ${requirementCount} staffing requirements satisfied`]

  if (understaffedCount > 0) {
    parts.push(`${understaffedCount} understaffed`)
  }

  if (overstaffedCount > 0) {
    parts.push(`${overstaffedCount} overstaffed`)
  }

  return parts.join(". ")
}

function conflictTitle(conflict: SerializedSchedulingConflict) {
  return conflict.rule
}

function severityClass(severity: string) {
  if (severity === "CRITICAL" || severity === "ERROR") {
    return "text-destructive"
  }

  if (severity === "INFO") {
    return "text-muted-foreground"
  }

  return "text-foreground"
}

function ConflictList({
  title,
  conflicts,
  staffNames,
  shiftTypeNames,
}: {
  title: string
  conflicts: SerializedSchedulingConflict[]
  staffNames: Record<string, string>
  shiftTypeNames: Record<string, string>
}) {
  if (conflicts.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="flex flex-col gap-3">
        {conflicts.map((conflict, index) => {
          const staffName = conflict.staffId
            ? (staffNames[conflict.staffId] ?? "Unknown staff")
            : null
          const shiftTypeId =
            typeof conflict.metadata?.shiftTypeId === "string"
              ? conflict.metadata.shiftTypeId
              : typeof conflict.metadata?.relatedShiftTypeId === "string"
                ? conflict.metadata.relatedShiftTypeId
                : null
          const shiftName = shiftTypeId ? (shiftTypeNames[shiftTypeId] ?? null) : null

          return (
            <li
              className="flex flex-col gap-1 border-t border-border pt-3 text-sm"
              key={`${conflict.code}-${conflict.assignmentId ?? conflict.date ?? ""}-${index}`}
            >
              <p className={severityClass(conflict.severity)}>
                {conflict.severity} · {conflict.code}
              </p>
              <p>
                {staffName ? `${staffName} · ` : null}
                {conflict.date ? `${conflict.date} · ` : null}
                {shiftName ? `${shiftName} · ` : null}
                {conflictTitle(conflict)}
              </p>
              <p className="text-muted-foreground">{conflict.message}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function RosterValidationSummary({
  validation,
  showPublishBlockMessage,
}: {
  validation: SerializedRosterValidation
  showPublishBlockMessage?: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">Roster validation</h2>
        <p className="text-sm text-muted-foreground">
          {validation.summary.assignmentsChecked}{" "}
          {validation.summary.assignmentsChecked === 1 ? "assignment" : "assignments"} checked
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">Coverage</h3>
        <p className="text-sm text-muted-foreground">{coverageLine(validation)}</p>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">Conflicts</h3>
        <p className="text-sm text-muted-foreground">
          {validation.summary.blockerCount}{" "}
          {validation.summary.blockerCount === 1 ? "blocker" : "blockers"} ·{" "}
          {validation.summary.warningCount}{" "}
          {validation.summary.warningCount === 1 ? "warning" : "warnings"} ·{" "}
          {validation.summary.infoCount} informational
        </p>
      </div>

      {showPublishBlockMessage && !validation.valid ? (
        <p className="text-sm text-destructive">
          Cannot publish. {validation.summary.blockerCount} blocking{" "}
          {validation.summary.blockerCount === 1 ? "issue" : "issues"} must be resolved.
        </p>
      ) : null}

      <ConflictList
        conflicts={validation.blockers}
        shiftTypeNames={validation.shiftTypeNames}
        staffNames={validation.staffNames}
        title="Blockers"
      />
      <ConflictList
        conflicts={validation.warnings}
        shiftTypeNames={validation.shiftTypeNames}
        staffNames={validation.staffNames}
        title="Warnings"
      />
      <ConflictList
        conflicts={validation.infos}
        shiftTypeNames={validation.shiftTypeNames}
        staffNames={validation.staffNames}
        title="Informational"
      />
    </div>
  )
}
