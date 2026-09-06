import type { db } from "@/prisma/db"

import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_NAMES,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/modules/organizations/default-roles"
import type { Permission } from "@/lib/permissions/permissions"

type PublicOrm = typeof db.orm

export async function ensurePermissionCatalog(orm: PublicOrm) {
  const catalog = new Map<Permission, { id: string; key: string }>()

  for (const key of ALL_PERMISSIONS) {
    const permission = await findOrCreatePermission(orm, key)
    catalog.set(key, { id: permission.id, key: permission.key })
  }

  return catalog
}

export async function ensureDefaultRoleGrants(orm: PublicOrm, organizationId: string) {
  const catalog = await ensurePermissionCatalog(orm)
  const roles = await orm.public.Role.where({ organizationId }).all()

  for (const roleName of DEFAULT_ROLE_NAMES) {
    const role = roles.find((candidate) => candidate.name === roleName)

    if (!role) {
      continue
    }

    for (const permissionKey of DEFAULT_ROLE_PERMISSIONS[roleName]) {
      const permission = catalog.get(permissionKey)

      if (!permission) {
        continue
      }

      const existing = await orm.public.RolePermission.where({
        roleId: role.id,
        permissionId: permission.id,
      }).first()

      if (existing) {
        continue
      }

      try {
        await orm.public.RolePermission.create({
          roleId: role.id,
          permissionId: permission.id,
        })
      } catch (error) {
        if (!isUniqueConstraintViolation(error)) {
          throw error
        }
      }
    }
  }
}

async function findOrCreatePermission(orm: PublicOrm, key: Permission) {
  const existing = await orm.public.Permission.where({ key }).first()

  if (existing) {
    return existing
  }

  try {
    return await orm.public.Permission.create({ key })
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      throw error
    }

    const raced = await orm.public.Permission.where({ key }).first()

    if (!raced) {
      throw error
    }

    return raced
  }
}
