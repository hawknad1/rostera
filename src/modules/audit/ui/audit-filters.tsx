import {
  auditActionLabels,
  auditActions,
  auditEntityLabels,
  auditEntityTypes,
} from "@/modules/audit/types/audit"
import type { AuditListFilters } from "@/modules/audit/services/audit"

const inputClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const labelClassName = "mb-1.5 block text-sm font-medium text-foreground"

export function AuditFilters({
  filters,
  actors,
}: {
  filters: AuditListFilters
  actors: { id: string; label: string }[]
}) {
  return (
    <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" method="get">
      <div>
        <label className={labelClassName} htmlFor="audit-filter-from">
          From
        </label>
        <input
          className={inputClassName}
          defaultValue={filters.from ?? ""}
          id="audit-filter-from"
          name="from"
          type="date"
        />
      </div>
      <div>
        <label className={labelClassName} htmlFor="audit-filter-to">
          To
        </label>
        <input
          className={inputClassName}
          defaultValue={filters.to ?? ""}
          id="audit-filter-to"
          name="to"
          type="date"
        />
      </div>
      <div>
        <label className={labelClassName} htmlFor="audit-filter-action">
          Action
        </label>
        <select
          className={selectClassName}
          defaultValue={filters.action ?? ""}
          id="audit-filter-action"
          name="action"
        >
          <option value="">All actions</option>
          {auditActions.map((action) => (
            <option key={action} value={action}>
              {auditActionLabels[action]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="audit-filter-entity">
          Entity
        </label>
        <select
          className={selectClassName}
          defaultValue={filters.entityType ?? ""}
          id="audit-filter-entity"
          name="entityType"
        >
          <option value="">All entities</option>
          {auditEntityTypes.map((entityType) => (
            <option key={entityType} value={entityType}>
              {auditEntityLabels[entityType]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="audit-filter-actor">
          Actor
        </label>
        <select
          className={selectClassName}
          defaultValue={filters.actorUserId ?? ""}
          id="audit-filter-actor"
          name="actor"
        >
          <option value="">All actors</option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="audit-filter-search">
          Search
        </label>
        <input
          className={inputClassName}
          defaultValue={filters.q ?? ""}
          id="audit-filter-search"
          name="q"
          placeholder="Summary or entity ID"
          type="search"
        />
      </div>
      <div className="flex items-end">
        <button
          className="h-9 text-sm font-medium text-primary underline-offset-4 hover:underline"
          type="submit"
        >
          Apply filters
        </button>
      </div>
    </form>
  )
}
