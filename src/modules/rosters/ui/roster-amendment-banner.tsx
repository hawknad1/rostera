import { rosterStatusLabels, type RosterStatus } from "@/modules/rosters/labels"
import { formatRosterInstantDate } from "@/modules/rosters/ui/format"

export function RosterAmendmentBanner({
  versionNumber,
  parentVersionNumber,
  reason,
  createdByLabel,
  createdAt,
  status,
}: {
  versionNumber: number
  parentVersionNumber: number | null
  reason: string | null
  createdByLabel: string
  createdAt: unknown
  status: RosterStatus
}) {
  if (versionNumber <= 1) {
    return null
  }

  return (
    <section className="rounded-md border border-border px-4 py-3">
      <p className="text-sm font-medium">
        This is an amendment of published version {parentVersionNumber ?? versionNumber - 1}.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Version {versionNumber} · {rosterStatusLabels[status]}
        {reason ? ` · ${reason}` : null}
      </p>
      <p className="text-sm text-muted-foreground">
        Created by {createdByLabel} on {formatRosterInstantDate(createdAt)}
      </p>
    </section>
  )
}
