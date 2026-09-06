import type { AuditListFilters } from "@/modules/audit/services/audit"

export function auditSearchParams(filters: AuditListFilters) {
  const params = new URLSearchParams()

  if (filters.action) {
    params.set("action", filters.action)
  }

  if (filters.entityType) {
    params.set("entityType", filters.entityType)
  }

  if (filters.actorUserId) {
    params.set("actor", filters.actorUserId)
  }

  if (filters.q) {
    params.set("q", filters.q)
  }

  if (filters.from) {
    params.set("from", filters.from)
  }

  if (filters.to) {
    params.set("to", filters.to)
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page))
  }

  const query = params.toString()
  return query.length > 0 ? `?${query}` : ""
}

export function auditHref(filters: AuditListFilters, page?: number) {
  return `/audit${auditSearchParams({ ...filters, page })}`
}
