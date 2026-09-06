import Link from "next/link"

import { auditEntityHref } from "@/modules/audit/deep-links"
import {
  auditActionLabels,
  auditEntityLabels,
} from "@/modules/audit/types/audit"
import type { AuditEventRecord } from "@/modules/audit/services/audit"
import { formatAuditTimestamp, formatAuditValue } from "@/modules/audit/ui/format"

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function changedFieldList(metadata: Record<string, unknown> | null) {
  const raw = metadata?.changedFields
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.filter((entry): entry is string => typeof entry === "string")
}

function FieldTable({
  title,
  values,
}: {
  title: string
  values: Record<string, unknown> | null
}) {
  if (!values || Object.keys(values).length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{title}</h2>
      <dl className="grid gap-2 sm:grid-cols-2">
        {Object.entries(values).map(([key, value]) => (
          <div className="flex flex-col gap-0.5" key={key}>
            <dt className="text-xs text-muted-foreground">{key}</dt>
            <dd className="text-sm">{formatAuditValue(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function AuditDetail({
  event,
  organizationName,
  timeZone,
}: {
  event: AuditEventRecord
  organizationName: string
  timeZone: string
}) {
  const href = auditEntityHref(event.entityType, event.entityId)
  const changedFields = changedFieldList(event.metadata)
  const before = asRecord(event.metadata?.before)
  const after = asRecord(event.metadata?.after)
  const extra = event.metadata
    ? Object.fromEntries(
        Object.entries(event.metadata).filter(
          ([key]) => key !== "before" && key !== "after" && key !== "changedFields",
        ),
      )
    : null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {formatAuditTimestamp(event.createdAt, timeZone)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {auditActionLabels[event.action]}
        </h1>
        <p className="text-sm text-muted-foreground">{event.summary}</p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Actor</dt>
          <dd className="text-sm">
            {event.actorLabel}
            {event.actorType === "SYSTEM" ? (
              <span className="text-muted-foreground"> (system)</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Organization</dt>
          <dd className="text-sm">{organizationName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Entity</dt>
          <dd className="text-sm">
            {auditEntityLabels[event.entityType]}
            {href ? (
              <>
                {" "}
                <Link
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  href={href}
                >
                  Open
                </Link>
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Entity ID</dt>
          <dd className="break-all text-sm">{event.entityId}</dd>
        </div>
      </dl>

      {changedFields.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Changed fields</h2>
          <p className="text-sm">{changedFields.join(", ")}</p>
        </section>
      ) : null}

      <FieldTable title="Before" values={before} />
      <FieldTable title="After" values={after} />
      <FieldTable title="Additional detail" values={extra && Object.keys(extra).length > 0 ? extra : null} />
    </div>
  )
}
