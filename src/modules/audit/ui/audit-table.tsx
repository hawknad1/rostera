import Link from "next/link"

import { auditActionLabels, auditEntityLabels } from "@/modules/audit/types/audit"
import type { AuditEventRecord, AuditListFilters } from "@/modules/audit/services/audit"
import { auditHref } from "@/modules/audit/ui/audit-query"
import { formatAuditTimestamp } from "@/modules/audit/ui/format"

export function AuditTable({
  events,
  timeZone,
  filters,
  page,
  hasPrevious,
  hasNext,
  total,
}: {
  events: AuditEventRecord[]
  timeZone: string
  filters: AuditListFilters
  page: number
  hasPrevious: boolean
  hasNext: boolean
  total: number
}) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit events match these filters.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">When</th>
              <th className="py-2 pr-4 font-medium">Actor</th>
              <th className="py-2 pr-4 font-medium">Action</th>
              <th className="py-2 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr className="border-b border-border" key={event.id}>
                <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                  {formatAuditTimestamp(event.createdAt, timeZone)}
                </td>
                <td className="py-3 pr-4">{event.actorLabel}</td>
                <td className="py-3 pr-4">
                  <Link
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href={`/audit/${event.id}`}
                  >
                    {auditActionLabels[event.action]}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {auditEntityLabels[event.entityType]}
                  </p>
                </td>
                <td className="py-3">{event.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Page {page} · {total} {total === 1 ? "event" : "events"}
        </p>
        <div className="flex items-center gap-4">
          {hasPrevious ? (
            <Link
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={auditHref(filters, page - 1)}
            >
              Previous
            </Link>
          ) : (
            <span className="text-muted-foreground">Previous</span>
          )}
          {hasNext ? (
            <Link
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={auditHref(filters, page + 1)}
            >
              Next
            </Link>
          ) : (
            <span className="text-muted-foreground">Next</span>
          )}
        </div>
      </div>
    </div>
  )
}
