import { redirect } from "next/navigation"

import type { Permission } from "@/lib/permissions/permissions"
import { db } from "@/prisma/db"

import type { CurrentMembership } from "./get-current-membership"
import { requireOrganization } from "./require-organization"

export async function requirePermission(
  permission: Permission,
): Promise<CurrentMembership> {
  const membership = await requireOrganization()
  const authorized = await membershipHasPermission(membership, permission)

  if (!authorized) {
    redirect("/forbidden")
  }

  return membership
}

async function membershipHasPermission(
  membership: CurrentMembership,
  permissionKey: Permission,
): Promise<boolean> {
  const role = await db.orm.public.Role.where({
    id: membership.roleId,
    organizationId: membership.organizationId,
  }).first()

  if (!role) {
    return false
  }

  const permission = await db.orm.public.Permission.where({
    key: permissionKey,
  }).first()

  if (!permission) {
    return false
  }

  const rolePermission = await db.orm.public.RolePermission.where({
    roleId: role.id,
    permissionId: permission.id,
  }).first()

  return rolePermission !== null
}
