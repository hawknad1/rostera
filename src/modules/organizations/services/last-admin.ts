import { lockOrganizationRow } from "@/lib/db/row-lock"
import { permissions } from "@/lib/permissions/permissions"
import type { PublicOrm } from "@/modules/audit/types/orm"

export async function roleHasAdminCapability(
  orm: PublicOrm,
  organizationId: string,
  roleId: string,
) {
  const role = await orm.public.Role.where({
    id: roleId,
    organizationId,
  }).first()

  if (!role || role.organizationId !== organizationId || role.isActive === false) {
    return false
  }

  if (role.isSystem && role.name === "SUPER_ADMIN") {
    return true
  }

  const permission = await orm.public.Permission.where({
    key: permissions.organizationEdit,
  }).first()

  if (!permission) {
    return false
  }

  const grant = await orm.public.RolePermission.where({
    roleId: role.id,
    permissionId: permission.id,
  }).first()

  return grant !== null
}

export async function countActiveAdmins(
  orm: PublicOrm,
  organizationId: string,
  options: { exceptMembershipId?: string; inactiveRoleId?: string } = {},
) {
  const members = await orm.public.OrganizationMember.where({
    organizationId,
    status: "ACTIVE",
  }).all()

  let count = 0

  for (const member of members) {
    if (member.id === options.exceptMembershipId) {
      continue
    }

    if (member.roleId === options.inactiveRoleId) {
      continue
    }

    if (await roleHasAdminCapability(orm, organizationId, member.roleId)) {
      count += 1
    }
  }

  return count
}

export async function assertNotLastAdmin(
  orm: PublicOrm,
  organizationId: string,
  options: { exceptMembershipId?: string; inactiveRoleId?: string } = {},
) {
  const locked = await lockOrganizationRow(orm, organizationId)

  if (!locked) {
    return false
  }

  const remaining = await countActiveAdmins(orm, organizationId, options)

  if (remaining < 1) {
    return false
  }

  return true
}
