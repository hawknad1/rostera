import type { CurrentMembership } from "@/lib/auth/get-current-membership"
import type { Permission } from "@/lib/permissions/permissions"
import { db } from "@/prisma/db"

export async function hasPermission(
  membership: Pick<CurrentMembership, "roleId" | "organizationId">,
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
