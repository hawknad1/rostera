import { redirect } from "next/navigation"

import type { CurrentMembership } from "@/lib/auth/get-current-membership"
import { requireOrganization } from "@/lib/auth/require-organization"
import { DEFAULT_ROLE_PERMISSIONS } from "@/modules/organizations/default-roles"
import { db } from "@/prisma/db"

const STAFF_SELF_SERVICE_PERMISSIONS = new Set<string>(DEFAULT_ROLE_PERMISSIONS.STAFF)

export async function listMembershipPermissionKeys(membership: CurrentMembership) {
  const grants = await db.orm.public.RolePermission.where({
    roleId: membership.roleId,
  }).all()

  const keys: string[] = []

  for (const grant of grants) {
    if (grant.roleId !== membership.roleId) {
      continue
    }

    const permission = await db.orm.public.Permission.where({
      id: grant.permissionId,
    }).first()

    if (permission) {
      keys.push(String(permission.key))
    }
  }

  return keys
}

export async function hasAdminSurfaceAccess(membership: CurrentMembership) {
  const keys = await listMembershipPermissionKeys(membership)
  return keys.some((key) => !STAFF_SELF_SERVICE_PERMISSIONS.has(key))
}

export async function requireAdminSurface(): Promise<CurrentMembership> {
  const membership = await requireOrganization()

  if (!(await hasAdminSurfaceAccess(membership))) {
    redirect("/forbidden")
  }

  return membership
}

