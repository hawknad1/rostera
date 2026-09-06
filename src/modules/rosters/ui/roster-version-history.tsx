import Link from "next/link"

import { rosterStatusLabels, type RosterStatus } from "@/modules/rosters/labels"
import { formatRosterInstantDate } from "@/modules/rosters/ui/format"

export type RosterVersionHistoryItem = {
  id: string
  versionNumber: number
  status: string
  amendmentReason: string | null
  createdAt: unknown
  updatedAt: unknown
  isCurrent: boolean
  isCurrentPublished: boolean
  isUnpublished: boolean
}

export function RosterVersionHistory({
  versions,
}: {
  versions: RosterVersionHistoryItem[]
}) {
  if (versions.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Version history</h2>
      <ul className="divide-y divide-border border-y border-border">
        {versions.map((version) => {
          const status = version.status as RosterStatus
          const timestamp = version.isUnpublished ? version.createdAt : version.updatedAt
          const timestampLabel = version.isUnpublished ? "Created" : "Published"
          const reason =
            version.versionNumber === 1
              ? "Original roster"
              : version.amendmentReason
                ? version.amendmentReason
                : null

          return (
            <li className="flex flex-wrap items-baseline justify-between gap-4 py-3" key={version.id}>
              <div className="min-w-0">
                <p className="font-medium">
                  Version {version.versionNumber}
                  {version.isCurrentPublished ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">Current</span>
                  ) : null}
                  {version.isUnpublished ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {status === "DRAFT" ? "Draft amendment" : rosterStatusLabels[status]}
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {timestampLabel} {formatRosterInstantDate(timestamp)}
                  {reason ? ` · ${reason}` : null}
                </p>
              </div>
              {version.isCurrent ? (
                <span className="text-sm text-muted-foreground">Viewing</span>
              ) : (
                <Link
                  className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href={`/rosters/${version.id}`}
                >
                  View
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
