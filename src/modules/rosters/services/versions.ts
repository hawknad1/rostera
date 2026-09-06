import { rosterError } from "@/modules/rosters/errors"

export type RosterVersionRow = {
  id: string
  organizationId: string
  seriesId?: unknown
  versionNumber?: unknown
  parentRosterId?: unknown
  status: string
  amendmentReason?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  name?: unknown
}

export function rosterSeriesId(roster: { id: unknown; seriesId?: unknown }) {
  return String(roster.seriesId ?? roster.id)
}

export function rosterVersionNumber(roster: { versionNumber?: unknown }) {
  const value = Number(roster.versionNumber)
  return Number.isInteger(value) && value >= 1 ? value : 1
}

export function isUnpublishedStatus(status: string) {
  return status === "DRAFT" || status === "IN_REVIEW"
}

export function sortRosterVersions<T extends { versionNumber?: unknown }>(rows: T[]) {
  return [...rows].sort((left, right) => rosterVersionNumber(right) - rosterVersionNumber(left))
}

export function unpublishedAmendment<T extends { status: string }>(versions: T[]) {
  return versions.find((roster) => isUnpublishedStatus(roster.status)) ?? null
}

export function currentPublishedVersion<T extends { status: string; versionNumber?: unknown }>(
  versions: T[],
) {
  const published = versions.filter((roster) => roster.status === "PUBLISHED")
  if (published.length === 0) {
    return null
  }

  return published.reduce((current, candidate) =>
    rosterVersionNumber(candidate) > rosterVersionNumber(current) ? candidate : current,
  )
}

export function operationalRoster<T extends { status: string; versionNumber?: unknown }>(
  versions: T[],
) {
  return unpublishedAmendment(versions) ?? currentPublishedVersion(versions) ?? sortRosterVersions(versions)[0] ?? null
}

export function selectOperationalRosters<T extends { id: unknown; seriesId?: unknown; status: string; versionNumber?: unknown }>(
  rosters: T[],
) {
  const bySeries = new Map<string, T[]>()

  for (const roster of rosters) {
    const seriesId = rosterSeriesId(roster)
    const current = bySeries.get(seriesId) ?? []
    current.push(roster)
    bySeries.set(seriesId, current)
  }

  const selected: T[] = []
  for (const versions of bySeries.values()) {
    const next = operationalRoster(versions)
    if (next) {
      selected.push(next)
    }
  }

  return selected
}

export function schedulingActiveRosterIds(rosters: RosterVersionRow[]) {
  const bySeries = new Map<string, RosterVersionRow[]>()

  for (const roster of rosters) {
    const seriesId = rosterSeriesId(roster)
    const current = bySeries.get(seriesId) ?? []
    current.push(roster)
    bySeries.set(seriesId, current)
  }

  const active = new Set<string>()
  for (const versions of bySeries.values()) {
    for (const roster of versions) {
      if (isUnpublishedStatus(roster.status)) {
        active.add(String(roster.id))
      }
    }

    const currentPublished = currentPublishedVersion(versions)
    if (currentPublished) {
      active.add(String(currentPublished.id))
    }
  }

  return active
}

export function isSchedulingPeerAssignment(
  assignment: { rosterId: unknown },
  target: { id: unknown; seriesId?: unknown },
  rosters: RosterVersionRow[],
) {
  if (String(assignment.rosterId) === String(target.id)) {
    return true
  }

  const owner = rosters.find((roster) => String(roster.id) === String(assignment.rosterId))
  if (!owner) {
    return false
  }

  if (rosterSeriesId(owner) === rosterSeriesId(target)) {
    return false
  }

  return schedulingActiveRosterIds(rosters).has(String(owner.id))
}

export function assertCurrentPublishedSource(
  source: RosterVersionRow,
  versions: RosterVersionRow[],
) {
  if (source.status !== "PUBLISHED") {
    throw rosterError("ROSTER_NOT_PUBLISHED")
  }

  const current = currentPublishedVersion(versions)
  if (!current || String(current.id) !== String(source.id)) {
    throw rosterError("NOT_CURRENT_PUBLISHED_VERSION")
  }
}

export function assertNoActiveAmendment(versions: RosterVersionRow[]) {
  if (unpublishedAmendment(versions)) {
    throw rosterError("AMENDMENT_ALREADY_EXISTS")
  }
}

export function nextVersionNumber(versions: RosterVersionRow[]) {
  return versions.reduce((max, roster) => Math.max(max, rosterVersionNumber(roster)), 0) + 1
}

export function parentVersion<T extends { id: unknown }>(
  roster: { parentRosterId?: unknown },
  versions: T[],
) {
  if (!roster.parentRosterId) {
    return null
  }

  return versions.find((candidate) => String(candidate.id) === String(roster.parentRosterId)) ?? null
}
