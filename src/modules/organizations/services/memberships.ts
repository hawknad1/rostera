import { permissions } from "@/lib/permissions/permissions"
import { recordUserAudit } from "@/modules/audit/services/record"
import { organizationAdminError } from "@/modules/organizations/errors"
import type {
  ChangeMembershipRoleInput,
  LinkMembershipStaffInput,
} from "@/modules/organizations/schemas/admin"
import { requireOrgPermission } from "@/modules/organizations/services/access"
import {
  assertNotLastAdmin,
  roleHasAdminCapability,
} from "@/modules/organizations/services/last-admin"
import { db } from "@/prisma/db"

export const MEMBERSHIP_PAGE_SIZE = 25

function staffName(staff: { firstName?: unknown; lastName?: unknown; staffNumber?: unknown }) {
  return `${String(staff.firstName ?? "")} ${String(staff.lastName ?? "")}`.trim() || String(staff.staffNumber ?? "")
}

export async function listMemberships(input: {
  page?: number
  query?: string
  roleId?: string
  status?: string
  linked?: "linked" | "unlinked" | ""
} = {}) {
  const membership = await requireOrgPermission(permissions.usersView)
  const organizationId = membership.organizationId
  const [members, staff] = await Promise.all([
    db.orm.public.OrganizationMember.where({ organizationId })
      .include("user")
      .include("role")
      .all(),
    db.orm.public.StaffProfile.where({ organizationId }).all(),
  ])

  const staffByUserId = new Map(
    staff
      .filter((profile) => profile.organizationId === organizationId && profile.userId)
      .map((profile) => [String(profile.userId), profile]),
  )

  const query = input.query?.trim().toLowerCase() ?? ""
  const filtered = members.filter((member) => {
    if (member.organizationId !== organizationId) {
      return false
    }

    if (input.roleId && member.roleId !== input.roleId) {
      return false
    }

    if (input.status && member.status !== input.status) {
      return false
    }

    const linkedStaff = staffByUserId.get(String(member.userId))
    if (input.linked === "linked" && !linkedStaff) {
      return false
    }
    if (input.linked === "unlinked" && linkedStaff) {
      return false
    }

    if (!query) {
      return true
    }

    const user = member.user as { email?: unknown; displayName?: unknown; phone?: unknown } | null
    const haystack = [
      user?.displayName,
      user?.email,
      user?.phone,
      member.role?.name,
      linkedStaff ? staffName(linkedStaff) : "",
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(query)
  })

  const sorted = [...filtered].sort((left, right) =>
    String(left.createdAt).localeCompare(String(right.createdAt)),
  )
  const page = Math.max(1, input.page ?? 1)
  const start = (page - 1) * MEMBERSHIP_PAGE_SIZE
  const items = sorted.slice(start, start + MEMBERSHIP_PAGE_SIZE).map((member) => ({
    ...member,
    staff: staffByUserId.get(String(member.userId)) ?? null,
  }))

  return {
    items,
    page,
    pageSize: MEMBERSHIP_PAGE_SIZE,
    total: sorted.length,
    pageCount: Math.max(1, Math.ceil(sorted.length / MEMBERSHIP_PAGE_SIZE)),
  }
}

export async function listOrganizationRoles() {
  const membership = await requireOrgPermission(permissions.usersView)
  return db.orm.public.Role.where({ organizationId: membership.organizationId }).all()
}

async function findOwnedMembership(organizationId: string, membershipId: string) {
  const member = await db.orm.public.OrganizationMember.where({
    id: membershipId,
    organizationId,
  })
    .include("role")
    .include("user")
    .first()

  if (!member || member.organizationId !== organizationId) {
    return null
  }

  return member
}

export async function changeMembershipRole(input: ChangeMembershipRoleInput) {
  const actor = await requireOrgPermission(permissions.usersEdit)
  const organizationId = actor.organizationId
  const member = await findOwnedMembership(organizationId, input.membershipId)

  if (!member) {
    throw organizationAdminError("NOT_FOUND")
  }

  const role = await db.orm.public.Role.where({
    id: input.roleId,
    organizationId,
  }).first()

  if (!role || role.organizationId !== organizationId) {
    throw organizationAdminError("ROLE_UNAVAILABLE")
  }

  if (role.isActive === false) {
    throw organizationAdminError("ROLE_UNAVAILABLE")
  }

  if (member.roleId === role.id) {
    return member
  }

  return db.transaction(async (tx) => {
    const currentlyAdmin = await roleHasAdminCapability(tx.orm, organizationId, member.roleId)
    const nextIsAdmin = await roleHasAdminCapability(tx.orm, organizationId, role.id)

    if (currentlyAdmin && !nextIsAdmin) {
      const remaining = await assertNotLastAdmin(tx.orm, organizationId, {
        exceptMembershipId: member.id,
      })
      if (!remaining) {
        throw organizationAdminError("LAST_ADMIN")
      }
    }

    const updated = await tx.orm.public.OrganizationMember.where({
      id: member.id,
      organizationId,
    }).update({
      roleId: role.id,
    })

    if (!updated) {
      throw organizationAdminError("NOT_FOUND")
    }

    await recordUserAudit(tx, actor, {
      action: "MEMBERSHIP_ROLE_CHANGED",
      entityType: "MEMBERSHIP",
      entityId: member.id,
      summary: `Changed membership role to ${role.name}.`,
      metadata: { fromRoleId: member.roleId, toRoleId: role.id },
    })

    return updated
  })
}

export async function deactivateMembership(input: { membershipId: string }) {
  const actor = await requireOrgPermission(permissions.usersDeactivate)
  const organizationId = actor.organizationId
  const member = await findOwnedMembership(organizationId, input.membershipId)

  if (!member) {
    throw organizationAdminError("NOT_FOUND")
  }

  if (member.status !== "ACTIVE") {
    return member
  }

  return db.transaction(async (tx) => {
    const currentlyAdmin = await roleHasAdminCapability(tx.orm, organizationId, member.roleId)

    if (currentlyAdmin) {
      const remaining = await assertNotLastAdmin(tx.orm, organizationId, {
        exceptMembershipId: member.id,
      })
      if (!remaining) {
        throw organizationAdminError("LAST_ADMIN")
      }
    }

    const updated = await tx.orm.public.OrganizationMember.where({
      id: member.id,
      organizationId,
      status: "ACTIVE",
    }).update({
      status: "SUSPENDED",
    })

    if (!updated) {
      throw organizationAdminError("NOT_FOUND")
    }

    await recordUserAudit(tx, actor, {
      action: "MEMBERSHIP_DEACTIVATED",
      entityType: "MEMBERSHIP",
      entityId: member.id,
      summary: "Deactivated organization membership.",
    })

    return updated
  })
}

export async function reactivateMembership(input: { membershipId: string }) {
  const actor = await requireOrgPermission(permissions.usersDeactivate)
  const organizationId = actor.organizationId
  const member = await findOwnedMembership(organizationId, input.membershipId)

  if (!member) {
    throw organizationAdminError("NOT_FOUND")
  }

  if (member.status === "ACTIVE") {
    return member
  }

  const role = await db.orm.public.Role.where({
    id: member.roleId,
    organizationId,
  }).first()

  if (!role || role.isActive === false) {
    throw organizationAdminError("ROLE_UNAVAILABLE")
  }

  return db.transaction(async (tx) => {
    const updated = await tx.orm.public.OrganizationMember.where({
      id: member.id,
      organizationId,
    }).update({
      status: "ACTIVE",
    })

    if (!updated) {
      throw organizationAdminError("NOT_FOUND")
    }

    await recordUserAudit(tx, actor, {
      action: "MEMBERSHIP_ACTIVATED",
      entityType: "MEMBERSHIP",
      entityId: member.id,
      summary: "Reactivated organization membership.",
    })

    return updated
  })
}

export async function linkMembershipStaff(input: LinkMembershipStaffInput) {
  const actor = await requireOrgPermission(permissions.staffEdit)
  const organizationId = actor.organizationId
  const member = await findOwnedMembership(organizationId, input.membershipId)

  if (!member || member.status !== "ACTIVE") {
    throw organizationAdminError("NOT_FOUND")
  }

  const staff = await db.orm.public.StaffProfile.where({
    id: input.staffId,
    organizationId,
  }).first()

  if (!staff || staff.organizationId !== organizationId) {
    throw organizationAdminError("NOT_FOUND")
  }

  if (staff.employmentStatus !== "ACTIVE") {
    throw organizationAdminError("INVALID_INPUT", "Only active staff profiles can be linked.")
  }

  if (staff.userId && staff.userId !== member.userId) {
    throw organizationAdminError("STAFF_ALREADY_LINKED")
  }

  const alreadyLinked = await db.orm.public.StaffProfile.where({
    organizationId,
    userId: member.userId,
  }).first()

  if (alreadyLinked && alreadyLinked.id !== staff.id) {
    throw organizationAdminError("USER_ALREADY_LINKED")
  }

  return db.transaction(async (tx) => {
    const updated = await tx.orm.public.StaffProfile.where({
      id: staff.id,
      organizationId,
    }).update({
      userId: member.userId,
    })

    if (!updated) {
      throw organizationAdminError("NOT_FOUND")
    }

    await recordUserAudit(tx, actor, {
      action: "STAFF_ACCOUNT_LINKED",
      entityType: "STAFF",
      entityId: staff.id,
      summary: "Linked a workforce profile to an application account.",
      metadata: { userId: member.userId, membershipId: member.id },
    })

    return updated
  })
}

export async function unlinkMembershipStaff(input: { membershipId: string }) {
  const actor = await requireOrgPermission(permissions.staffEdit)
  const organizationId = actor.organizationId
  const member = await findOwnedMembership(organizationId, input.membershipId)

  if (!member) {
    throw organizationAdminError("NOT_FOUND")
  }

  const staff = await db.orm.public.StaffProfile.where({
    organizationId,
    userId: member.userId,
  }).first()

  if (!staff) {
    return null
  }

  return db.transaction(async (tx) => {
    const updated = await tx.orm.public.StaffProfile.where({
      id: staff.id,
      organizationId,
      userId: member.userId,
    }).update({
      userId: null,
    })

    if (!updated) {
      throw organizationAdminError("NOT_FOUND")
    }

    await recordUserAudit(tx, actor, {
      action: "STAFF_ACCOUNT_UNLINKED",
      entityType: "STAFF",
      entityId: staff.id,
      summary: "Unlinked a workforce profile from an application account.",
      metadata: { userId: member.userId, membershipId: member.id },
    })

    return updated
  })
}

export async function listUnlinkedActiveStaff() {
  const membership = await requireOrgPermission(permissions.staffEdit)
  const staff = await db.orm.public.StaffProfile.where({
    organizationId: membership.organizationId,
    employmentStatus: "ACTIVE",
  }).all()

  return staff.filter((profile) => !profile.userId && profile.organizationId === membership.organizationId)
}
