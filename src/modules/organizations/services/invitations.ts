import { Temporal } from "temporal-polyfill"

import { appConfig } from "@/lib/config"
import { getAuthUser } from "@/lib/auth/get-auth-user"
import { getCurrentUser } from "@/lib/auth/get-current-user"
import { writeActiveOrganizationCookie } from "@/lib/auth/active-organization"
import { permissions } from "@/lib/permissions/permissions"
import { recordUserAudit } from "@/modules/audit/services/record"
import { normalizeEmail } from "@/modules/notifications/phone"
import {
  enqueueDomainNotification,
  processDomainNotification,
} from "@/modules/notifications/services/emit"
import { organizationAdminError } from "@/modules/organizations/errors"
import type {
  AcceptInvitationInput,
  InvitationIdInput,
  InviteUserInput,
} from "@/modules/organizations/schemas/admin"
import { requireOrgPermission } from "@/modules/organizations/services/access"
import {
  createInvitationToken,
  hashInvitationToken,
} from "@/modules/organizations/services/invitation-token"
import { syncAuthenticatedUser } from "@/modules/users/services/syncAuthenticatedUser"
import { db } from "@/prisma/db"

const INVITATION_TTL_HOURS = 24 * 7
const RESEND_COOLDOWN_MINUTES = 10
const INVITATION_CREATE_WINDOW_MINUTES = 15
const INVITATION_CREATE_MAX = 20
export const INVITATION_PAGE_SIZE = 25

function asInstant(value: unknown) {
  return Temporal.Instant.from(String(value))
}

function isExpired(expiresAt: unknown, now = Temporal.Now.instant()) {
  return Temporal.Instant.compare(asInstant(expiresAt), now) <= 0
}

function isRateLimited(updatedAt: unknown, now = Temporal.Now.instant()) {
  const elapsed = now.since(asInstant(updatedAt)).total({ unit: "minutes" })
  return elapsed < RESEND_COOLDOWN_MINUTES
}

function isRecent(value: unknown, now: Temporal.Instant, minutes: number) {
  try {
    return now.since(asInstant(value)).total({ unit: "minutes" }) < minutes
  } catch {
    return true
  }
}

function isEmailVerified(authUser: { email_confirmed_at?: string | null; confirmed_at?: string | null }) {
  if (authUser.email_confirmed_at === undefined && authUser.confirmed_at === undefined) {
    return true
  }

  return Boolean(authUser.email_confirmed_at ?? authUser.confirmed_at)
}

async function findAssignableRole(organizationId: string, roleId: string) {
  const role = await db.orm.public.Role.where({
    id: roleId,
    organizationId,
  }).first()

  if (!role || role.organizationId !== organizationId || role.isActive === false) {
    return null
  }

  return role
}

async function pendingInvitationForEmail(organizationId: string, email: string) {
  const invitations = await db.orm.public.OrganizationInvitation.where({
    organizationId,
    email,
    status: "PENDING",
  }).all()

  return invitations[0] ?? null
}

export async function listInvitations(input: { page?: number; status?: string } = {}) {
  const membership = await requireOrgPermission(permissions.usersView)
  const organizationId = membership.organizationId
  const page = Math.max(1, input.page ?? 1)
  const invitations = await db.orm.public.OrganizationInvitation.where({
    organizationId,
  })
    .include("role")
    .all()

  const filtered = invitations.filter((invitation) => {
    if (invitation.organizationId !== organizationId) {
      return false
    }

    if (input.status && invitation.status !== input.status) {
      return false
    }

    return true
  })

  const sorted = [...filtered].sort((left, right) =>
    String(right.createdAt).localeCompare(String(left.createdAt)),
  )
  const start = (page - 1) * INVITATION_PAGE_SIZE
  const items = sorted.slice(start, start + INVITATION_PAGE_SIZE)

  return {
    items,
    page,
    pageSize: INVITATION_PAGE_SIZE,
    total: sorted.length,
    pageCount: Math.max(1, Math.ceil(sorted.length / INVITATION_PAGE_SIZE)),
  }
}

export async function createInvitation(input: InviteUserInput) {
  const membership = await requireOrgPermission(permissions.usersInvite)
  const organizationId = membership.organizationId
  const email = normalizeEmail(input.email)

  if (!email) {
    throw organizationAdminError("INVALID_INPUT", "Enter a valid email address.")
  }

  const role = await findAssignableRole(organizationId, input.roleId)

  if (!role) {
    throw organizationAdminError("ROLE_UNAVAILABLE")
  }

  const existing = await pendingInvitationForEmail(organizationId, email)

  if (existing) {
    throw organizationAdminError("DUPLICATE")
  }

  const organization = await db.orm.public.Organization.where({ id: organizationId }).first()

  if (!organization || organization.status !== "ACTIVE") {
    throw organizationAdminError("ORGANIZATION_SUSPENDED")
  }

  const now = Temporal.Now.instant()
  const recentInvites = (
    await db.orm.public.OrganizationInvitation.where({
      organizationId,
      invitedByUserId: membership.userId,
    }).all()
  ).filter(
    (row) =>
      row.organizationId === organizationId &&
      row.invitedByUserId === membership.userId &&
      isRecent(row.createdAt ?? row.updatedAt, now, INVITATION_CREATE_WINDOW_MINUTES),
  )

  if (recentInvites.length >= INVITATION_CREATE_MAX) {
    throw organizationAdminError("INVITATION_RATE_LIMITED")
  }

  const { token, tokenHash } = createInvitationToken()
  const expiresAt = Temporal.Now.instant().add({ hours: INVITATION_TTL_HOURS })

  const invitation = await db.transaction(async (tx) => {
    const created = await tx.orm.public.OrganizationInvitation.create({
      organizationId,
      email,
      roleId: role.id,
      tokenHash,
      status: "PENDING",
      expiresAt,
      invitedByUserId: membership.userId,
    })

    await recordUserAudit(tx, membership, {
      action: "USER_INVITED",
      entityType: "INVITATION",
      entityId: created.id,
      summary: `Invited ${email} as ${role.name}.`,
      metadata: { email, roleId: role.id, roleName: role.name },
    })

    await enqueueDomainNotification(tx, {
      type: "ORGANIZATION_INVITED",
      organizationId,
      eventId: created.id,
      actorUserId: membership.userId,
      inviteeEmail: email,
      organizationName: String(organization.name),
      roleName: role.name,
      acceptUrl: `${appConfig.url}/invite/accept?token=${token}`,
    })

    return created
  })

  await processDomainNotification({
    organizationId,
    type: "ORGANIZATION_INVITED",
    eventId: invitation.id,
  })

  return invitation
}

export async function resendInvitation(input: InvitationIdInput) {
  const membership = await requireOrgPermission(permissions.usersInvite)
  const organizationId = membership.organizationId
  const invitation = await db.orm.public.OrganizationInvitation.where({
    id: input.invitationId,
    organizationId,
  }).first()

  if (!invitation || invitation.organizationId !== organizationId) {
    throw organizationAdminError("NOT_FOUND")
  }

  if (invitation.status !== "PENDING") {
    throw organizationAdminError(
      invitation.status === "REVOKED"
        ? "INVITATION_REVOKED"
        : invitation.status === "ACCEPTED"
          ? "INVITATION_ACCEPTED"
          : "INVITATION_EXPIRED",
    )
  }

  if (isExpired(invitation.expiresAt)) {
    await db.orm.public.OrganizationInvitation.where({
      id: invitation.id,
      organizationId,
      status: "PENDING",
    }).update({ status: "EXPIRED" })
    throw organizationAdminError("INVITATION_EXPIRED")
  }

  if (isRateLimited(invitation.updatedAt ?? invitation.createdAt)) {
    throw organizationAdminError("INVITATION_RATE_LIMITED")
  }

  const role = await findAssignableRole(organizationId, invitation.roleId)

  if (!role) {
    throw organizationAdminError("ROLE_UNAVAILABLE")
  }

  const organization = await db.orm.public.Organization.where({ id: organizationId }).first()

  if (!organization || organization.status !== "ACTIVE") {
    throw organizationAdminError("ORGANIZATION_SUSPENDED")
  }

  const { token, tokenHash } = createInvitationToken()
  const expiresAt = Temporal.Now.instant().add({ hours: INVITATION_TTL_HOURS })
  const eventId = `${invitation.id}:resend:${crypto.randomUUID()}`

  const updated = await db.transaction(async (tx) => {
    const next = await tx.orm.public.OrganizationInvitation.where({
      id: invitation.id,
      organizationId,
      status: "PENDING",
    }).update({
      tokenHash,
      expiresAt,
    })

    if (!next) {
      throw organizationAdminError("NOT_FOUND")
    }

    await recordUserAudit(tx, membership, {
      action: "INVITATION_RESENT",
      entityType: "INVITATION",
      entityId: invitation.id,
      summary: `Resent invitation to ${invitation.email}.`,
      metadata: { email: invitation.email, roleId: role.id },
    })

    await enqueueDomainNotification(tx, {
      type: "ORGANIZATION_INVITED",
      organizationId,
      eventId,
      actorUserId: membership.userId,
      inviteeEmail: String(invitation.email),
      organizationName: String(organization.name),
      roleName: role.name,
      acceptUrl: `${appConfig.url}/invite/accept?token=${token}`,
    })

    return next
  })

  await processDomainNotification({
    organizationId,
    type: "ORGANIZATION_INVITED",
    eventId,
  })

  return updated
}

export async function revokeInvitation(input: InvitationIdInput) {
  const membership = await requireOrgPermission(permissions.usersInvite)
  const organizationId = membership.organizationId
  const invitation = await db.orm.public.OrganizationInvitation.where({
    id: input.invitationId,
    organizationId,
  }).first()

  if (!invitation || invitation.organizationId !== organizationId) {
    throw organizationAdminError("NOT_FOUND")
  }

  if (invitation.status !== "PENDING") {
    throw organizationAdminError(
      invitation.status === "REVOKED" ? "INVITATION_REVOKED" : "INVITATION_ACCEPTED",
    )
  }

  return db.transaction(async (tx) => {
    const updated = await tx.orm.public.OrganizationInvitation.where({
      id: invitation.id,
      organizationId,
      status: "PENDING",
    }).update({
      status: "REVOKED",
    })

    if (!updated) {
      throw organizationAdminError("NOT_FOUND")
    }

    await recordUserAudit(tx, membership, {
      action: "INVITATION_REVOKED",
      entityType: "INVITATION",
      entityId: invitation.id,
      summary: `Revoked invitation to ${invitation.email}.`,
      metadata: { email: invitation.email },
    })

    return updated
  })
}

export async function acceptInvitation(input: AcceptInvitationInput) {
  const authUser = await getAuthUser()

  if (!authUser) {
    throw organizationAdminError("UNAUTHENTICATED")
  }

  const authenticatedEmail = normalizeEmail(authUser.email)

  if (!authenticatedEmail) {
    throw organizationAdminError("INVITATION_EMAIL_MISMATCH")
  }

  if (!isEmailVerified(authUser)) {
    throw organizationAdminError("INVITATION_EMAIL_MISMATCH", "Verify your email before accepting this invitation.")
  }

  const tokenHash = hashInvitationToken(input.token)
  const invitation = await db.orm.public.OrganizationInvitation.where({ tokenHash }).first()

  if (!invitation) {
    throw organizationAdminError("NOT_FOUND")
  }

  if (invitation.status === "REVOKED") {
    throw organizationAdminError("INVITATION_REVOKED")
  }

  if (invitation.status === "ACCEPTED") {
    throw organizationAdminError("INVITATION_ACCEPTED")
  }

  if (invitation.status !== "PENDING" || isExpired(invitation.expiresAt)) {
    if (invitation.status === "PENDING") {
      await db.orm.public.OrganizationInvitation.where({
        id: invitation.id,
        status: "PENDING",
      }).update({ status: "EXPIRED" })
    }

    throw organizationAdminError("INVITATION_EXPIRED")
  }

  if (normalizeEmail(String(invitation.email)) !== authenticatedEmail) {
    throw organizationAdminError("INVITATION_EMAIL_MISMATCH")
  }

  const organization = await db.orm.public.Organization.where({
    id: invitation.organizationId,
  }).first()

  if (!organization || organization.status !== "ACTIVE") {
    throw organizationAdminError("ORGANIZATION_SUSPENDED")
  }

  const role = await findAssignableRole(invitation.organizationId, invitation.roleId)

  if (!role) {
    throw organizationAdminError("ROLE_UNAVAILABLE")
  }

  const result = await db.transaction(async (tx) => {
    const user = await syncAuthenticatedUser(tx.orm, {
      id: authUser.id,
      email: authUser.email,
      phone: authUser.phone,
    })

    const existingMembership = await tx.orm.public.OrganizationMember.where({
      organizationId: invitation.organizationId,
      userId: user.id,
    }).first()

    if (existingMembership?.status === "ACTIVE") {
      throw organizationAdminError("DUPLICATE", "You already belong to this organization.")
    }

    const membership = existingMembership
      ? await tx.orm.public.OrganizationMember.where({
          id: existingMembership.id,
          organizationId: invitation.organizationId,
        }).update({
          roleId: role.id,
          status: "ACTIVE",
        })
      : await tx.orm.public.OrganizationMember.create({
          organizationId: invitation.organizationId,
          userId: user.id,
          roleId: role.id,
          status: "ACTIVE",
        })

    if (!membership) {
      throw organizationAdminError("FAILED")
    }

    const accepted = await tx.orm.public.OrganizationInvitation.where({
      id: invitation.id,
      status: "PENDING",
    }).update({
      status: "ACCEPTED",
      acceptedAt: Temporal.Now.instant(),
      acceptedByUserId: user.id,
    })

    if (!accepted) {
      throw organizationAdminError("INVITATION_ACCEPTED")
    }

    await recordUserAudit(tx, membership, {
      action: "INVITATION_ACCEPTED",
      entityType: "INVITATION",
      entityId: invitation.id,
      summary: `${authenticatedEmail} accepted an organization invitation.`,
      metadata: { email: invitation.email, roleId: role.id },
    })

    return { membership, user, organization }
  })

  await writeActiveOrganizationCookie(invitation.organizationId)
  return result
}

export async function previewInvitation(token: string) {
  const tokenHash = hashInvitationToken(token)
  const invitation = await db.orm.public.OrganizationInvitation.where({ tokenHash })
    .include("organization")
    .include("role")
    .first()

  if (!invitation) {
    return null
  }

  return invitation
}

export async function getCurrentUserEmail() {
  const [authUser, user] = await Promise.all([getAuthUser(), getCurrentUser()])
  return normalizeEmail(authUser?.email ?? user?.email)
}
