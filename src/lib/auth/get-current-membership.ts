import { db } from "@/prisma/db"

import {
  clearActiveOrganizationCookie,
  readActiveOrganizationCookie,
  writeActiveOrganizationCookie,
} from "./active-organization"
import { getCurrentUser } from "./get-current-user"

export function isOrganizationOperational(organization: { status?: unknown }) {
  return organization.status === "ACTIVE"
}

export async function listActiveMemberships() {
  const user = await getCurrentUser()

  if (!user) {
    return []
  }

  return listActiveMembershipsForUser(user.id)
}

async function listActiveMembershipsForUser(userId: string) {
  const memberships = await db.orm.public.OrganizationMember.where({
    userId,
    status: "ACTIVE",
  })
    .include("organization")
    .include("role")
    .all()

  return memberships.filter(
    (membership) => membership.role.organizationId === membership.organizationId,
  )
}

export type ResolvedMembership = Awaited<ReturnType<typeof listActiveMembershipsForUser>>[number]

export type MembershipResolution =
  | { status: "unauthenticated" }
  | { status: "no_membership" }
  | { status: "needs_selection"; memberships: ResolvedMembership[] }
  | { status: "suspended"; membership: ResolvedMembership }
  | { status: "ready"; membership: ResolvedMembership }

export async function resolveMembership(): Promise<MembershipResolution> {
  const user = await getCurrentUser()

  if (!user) {
    return { status: "unauthenticated" }
  }

  const memberships = await listActiveMembershipsForUser(user.id)

  if (memberships.length === 0) {
    return { status: "no_membership" }
  }

  const operational = memberships.filter((membership) =>
    isOrganizationOperational(membership.organization),
  )
  const selectedId = await readActiveOrganizationCookie()
  const selected = selectedId
    ? memberships.find((membership) => membership.organizationId === selectedId)
    : undefined

  if (selected && isOrganizationOperational(selected.organization)) {
    return { status: "ready", membership: selected }
  }

  if (selected && !isOrganizationOperational(selected.organization)) {
    return { status: "suspended", membership: selected }
  }

  if (selectedId && !selected) {
    await clearActiveOrganizationCookie()
  }

  if (operational.length === 1) {
    const membership = operational[0]!
    await writeActiveOrganizationCookie(membership.organizationId)
    return { status: "ready", membership }
  }

  if (operational.length > 1) {
    return { status: "needs_selection", memberships: operational }
  }

  if (memberships.length === 1) {
    return { status: "suspended", membership: memberships[0]! }
  }

  return { status: "needs_selection", memberships }
}

export async function getCurrentMembership() {
  const resolved = await resolveMembership()
  return resolved.status === "ready" ? resolved.membership : null
}

export type CurrentMembership = ResolvedMembership

export async function getActiveOrganization() {
  const membership = await getCurrentMembership()
  return membership?.organization ?? null
}

export async function getUserOrganizations() {
  const memberships = await listActiveMemberships()
  return memberships.filter((membership) => isOrganizationOperational(membership.organization))
}

export async function setActiveOrganization(organizationId: string) {
  const memberships = await listActiveMemberships()
  const membership = memberships.find((candidate) => candidate.organizationId === organizationId)

  if (!membership || !isOrganizationOperational(membership.organization)) {
    return null
  }

  await writeActiveOrganizationCookie(membership.organizationId)
  return membership
}
