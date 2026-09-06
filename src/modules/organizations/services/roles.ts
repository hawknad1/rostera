import { ALL_PERMISSIONS, DEFAULT_ROLE_NAMES } from "@/modules/organizations/default-roles"
import { permissions, type Permission } from "@/lib/permissions/permissions"
import { recordUserAudit } from "@/modules/audit/services/record"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { organizationAdminError } from "@/modules/organizations/errors"
import type { CreateCustomRoleInput, UpdateCustomRoleInput } from "@/modules/organizations/schemas/admin"
import { requireOrgPermission } from "@/modules/organizations/services/access"
import { assertNotLastAdmin, roleHasAdminCapability } from "@/modules/organizations/services/last-admin"
import { db } from "@/prisma/db"

function isPermissionKey(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value)
}

async function permissionCatalog() {
  const catalog = new Map<string, { id: string; key: string }>()

  for (const key of ALL_PERMISSIONS) {
    const permission = await db.orm.public.Permission.where({ key }).first()
    if (permission) {
      catalog.set(key, { id: permission.id, key: permission.key })
    }
  }

  return catalog
}

export async function listRolesWithUsage() {
  const membership = await requireOrgPermission(permissions.rolesView)
  const organizationId = membership.organizationId
  const [roles, members] = await Promise.all([
    db.orm.public.Role.where({ organizationId }).all(),
    db.orm.public.OrganizationMember.where({ organizationId, status: "ACTIVE" }).all(),
  ])

  return roles
    .filter((role) => role.organizationId === organizationId)
    .map((role) => ({
      ...role,
      memberCount: members.filter((member) => member.roleId === role.id).length,
    }))
}

export async function getRoleDetail(roleId: string) {
  const membership = await requireOrgPermission(permissions.rolesView)
  const organizationId = membership.organizationId
  const role = await db.orm.public.Role.where({ id: roleId, organizationId }).first()

  if (!role || role.organizationId !== organizationId) {
    throw organizationAdminError("NOT_FOUND")
  }

  const [grants, members, catalog] = await Promise.all([
    db.orm.public.RolePermission.where({ roleId: role.id }).all(),
    db.orm.public.OrganizationMember.where({ organizationId, roleId: role.id, status: "ACTIVE" }).all(),
    permissionCatalog(),
  ])

  const permissionKeys = grants
    .map((grant) => {
      for (const [key, permission] of catalog) {
        if (permission.id === grant.permissionId) {
          return key
        }
      }
      return null
    })
    .filter((key): key is string => Boolean(key))
    .sort()

  return {
    role,
    permissionKeys,
    memberCount: members.length,
    catalog: ALL_PERMISSIONS,
  }
}

export async function createCustomRole(input: CreateCustomRoleInput) {
  const actor = await requireOrgPermission(permissions.rolesCreate)
  const organizationId = actor.organizationId
  const name = input.name.trim()

  if ((DEFAULT_ROLE_NAMES as readonly string[]).includes(name)) {
    throw organizationAdminError("INVALID_INPUT", "That name is reserved for a system role.")
  }

  const permissionKeys = input.permissionKeys.filter(isPermissionKey)
  const catalog = await permissionCatalog()

  try {
    return await db.transaction(async (tx) => {
      const role = await tx.orm.public.Role.create({
        organizationId,
        name,
        description: input.description ?? null,
        isSystem: false,
        isActive: true,
      })

      const grants = permissionKeys.flatMap((key) => {
        const permission = catalog.get(key)
        return permission ? [{ roleId: role.id, permissionId: permission.id }] : []
      })

      if (grants.length > 0) {
        await tx.orm.public.RolePermission.createAll(grants)
      }

      await recordUserAudit(tx, actor, {
        action: "ROLE_CREATED",
        entityType: "ROLE",
        entityId: role.id,
        summary: `Created custom role ${name}.`,
        metadata: { permissionKeys },
      })

      return role
    })
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw organizationAdminError("DUPLICATE", "A role with that name already exists.")
    }

    throw organizationAdminError("FAILED")
  }
}

export async function updateCustomRole(input: UpdateCustomRoleInput) {
  const actor = await requireOrgPermission(permissions.rolesEdit)
  const organizationId = actor.organizationId
  const role = await db.orm.public.Role.where({
    id: input.roleId,
    organizationId,
  }).first()

  if (!role || role.organizationId !== organizationId) {
    throw organizationAdminError("NOT_FOUND")
  }

  if (role.isSystem) {
    throw organizationAdminError("FORBIDDEN", "System roles cannot be edited.")
  }

  const name = input.name.trim()

  if ((DEFAULT_ROLE_NAMES as readonly string[]).includes(name) && name !== role.name) {
    throw organizationAdminError("INVALID_INPUT", "That name is reserved for a system role.")
  }

  const permissionKeys = input.permissionKeys.filter(isPermissionKey)
  const catalog = await permissionCatalog()
  const nextIds = new Set(
    permissionKeys
      .map((key) => catalog.get(key)?.id)
      .filter((id): id is string => Boolean(id)),
  )

  return db.transaction(async (tx) => {
    const currentlyAdmin = await roleHasAdminCapability(tx.orm, organizationId, role.id)
    const nextIsAdmin = permissionKeys.includes(permissions.organizationEdit)

    if (currentlyAdmin && !nextIsAdmin) {
      const remaining = await assertNotLastAdmin(tx.orm, organizationId, {
        inactiveRoleId: role.id,
      })
      if (!remaining) {
        throw organizationAdminError("LAST_ADMIN")
      }
    }

    const updated = await tx.orm.public.Role.where({
      id: role.id,
      organizationId,
    }).update({
      name,
      description: input.description ?? null,
    })

    if (!updated) {
      throw organizationAdminError("NOT_FOUND")
    }

    const existing = await tx.orm.public.RolePermission.where({ roleId: role.id }).all()

    for (const grant of existing) {
      if (!nextIds.has(grant.permissionId)) {
        await tx.orm.public.RolePermission.where({
          roleId: role.id,
          permissionId: grant.permissionId,
        }).delete()
      }
    }

    const existingIds = new Set(existing.map((grant) => grant.permissionId))

    for (const permissionId of nextIds) {
      if (!existingIds.has(permissionId)) {
        await tx.orm.public.RolePermission.create({
          roleId: role.id,
          permissionId,
        })
      }
    }

    await recordUserAudit(tx, actor, {
      action: "ROLE_UPDATED",
      entityType: "ROLE",
      entityId: role.id,
      summary: `Updated custom role ${name}.`,
      metadata: { permissionKeys },
    })

    return updated
  })
}

export async function deactivateCustomRole(input: { roleId: string }) {
  const actor = await requireOrgPermission(permissions.rolesDeactivate)
  const organizationId = actor.organizationId
  const role = await db.orm.public.Role.where({
    id: input.roleId,
    organizationId,
  }).first()

  if (!role || role.organizationId !== organizationId) {
    throw organizationAdminError("NOT_FOUND")
  }

  if (role.isSystem) {
    throw organizationAdminError("FORBIDDEN", "System roles cannot be deactivated.")
  }

  if (role.isActive === false) {
    return role
  }

  return db.transaction(async (tx) => {
    const remaining = await assertNotLastAdmin(tx.orm, organizationId, {
      inactiveRoleId: role.id,
    })

    if (!remaining) {
      throw organizationAdminError("LAST_ADMIN")
    }

    const updated = await tx.orm.public.Role.where({
      id: role.id,
      organizationId,
    }).update({
      isActive: false,
    })

    if (!updated) {
      throw organizationAdminError("NOT_FOUND")
    }

    await recordUserAudit(tx, actor, {
      action: "ROLE_DEACTIVATED",
      entityType: "ROLE",
      entityId: role.id,
      summary: `Deactivated custom role ${role.name}.`,
    })

    return updated
  })
}
