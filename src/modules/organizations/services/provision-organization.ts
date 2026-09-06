import { db } from "@/prisma/db"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import {
  isOrganizationSlugUniqueViolation,
  isUniqueConstraintViolation,
} from "@/lib/db/unique-constraint"
import {
  DEFAULT_ROLE_NAMES,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/modules/organizations/default-roles"
import { OrganizationProvisioningError } from "@/modules/organizations/errors"
import { ensurePermissionCatalog } from "@/modules/organizations/ensure-permissions"
import type { ProvisionOrganizationInput } from "@/modules/organizations/schemas/provision-organization"
import {
  organizationSlugCandidate,
  toOrganizationSlug,
} from "@/modules/organizations/slug"
import { syncAuthenticatedUser } from "@/modules/users/services/syncAuthenticatedUser"
import { ensureDefaultSchedulingPolicy } from "@/modules/organizations/services/ensure-scheduling-policy"

type PublicOrm = typeof db.orm

const SLUG_RETRY_LIMIT = 8

export async function provisionOrganization(input: ProvisionOrganizationInput) {
  const authUser = await getAuthUser()

  if (!authUser) {
    throw new OrganizationProvisioningError(
      "UNAUTHENTICATED",
      "You must be signed in to create an organization.",
    )
  }

  await rejectIfAlreadyMember(db.orm, authUser.id)

  const {
    name,
    phone,
    email,
    address,
    city,
    region,
    country,
    timezone,
  } = input

  const baseSlug = toOrganizationSlug(name)
  let slugOffset = 0

  while (slugOffset < SLUG_RETRY_LIMIT) {
    try {
      return await db.transaction(async (tx) => {
        const user = await syncAuthenticatedUser(tx.orm, {
          id: authUser.id,
          email: authUser.email,
          phone: authUser.phone,
        })

        await rejectIfAlreadyMemberByUserId(tx.orm, user.id)

        const permissionCatalog = await ensurePermissionCatalog(tx.orm)
        const slug = await allocateOrganizationSlug(tx.orm, baseSlug, slugOffset)

        const organization = await tx.orm.public.Organization.create({
          name,
          slug,
          status: "ACTIVE",
          country,
          timezone,
          ...(phone ? { phone } : {}),
          ...(email ? { email } : {}),
          ...(address ? { address } : {}),
          ...(city ? { city } : {}),
          ...(region ? { region } : {}),
        })

        const roles = await tx.orm.public.Role.createAll(
          DEFAULT_ROLE_NAMES.map((roleName) => ({
            organizationId: organization.id,
            name: roleName,
          })),
        )

        const rolesByName = new Map(roles.map((role) => [role.name, role]))
        const superAdminRole = rolesByName.get("SUPER_ADMIN")

        if (!superAdminRole || superAdminRole.organizationId !== organization.id) {
          throw new OrganizationProvisioningError(
            "PROVISIONING_FAILED",
            "Unable to create the organization. Please try again.",
          )
        }

        const rolePermissions = DEFAULT_ROLE_NAMES.flatMap((roleName) => {
          const role = rolesByName.get(roleName)

          if (!role || role.organizationId !== organization.id) {
            throw new OrganizationProvisioningError(
              "PROVISIONING_FAILED",
              "Unable to create the organization. Please try again.",
            )
          }

          return DEFAULT_ROLE_PERMISSIONS[roleName].map((permissionKey) => {
            const permission = permissionCatalog.get(permissionKey)

            if (!permission) {
              throw new OrganizationProvisioningError(
                "PROVISIONING_FAILED",
                "Unable to create the organization. Please try again.",
              )
            }

            return {
              roleId: role.id,
              permissionId: permission.id,
            }
          })
        })

        await tx.orm.public.RolePermission.createAll(rolePermissions)

        const membership = await tx.orm.public.OrganizationMember.create({
          organizationId: organization.id,
          userId: user.id,
          roleId: superAdminRole.id,
          status: "ACTIVE",
        })

        await ensureDefaultSchedulingPolicy(tx.orm, organization.id)

        if (
          membership.status !== "ACTIVE" ||
          membership.roleId !== superAdminRole.id ||
          membership.organizationId !== organization.id ||
          membership.userId !== user.id
        ) {
          throw new OrganizationProvisioningError(
            "PROVISIONING_FAILED",
            "Unable to create the organization. Please try again.",
          )
        }

        return {
          organization,
          membership,
          user,
          role: superAdminRole,
        }
      })
    } catch (error) {
      if (error instanceof OrganizationProvisioningError) {
        throw error
      }

      if (isOrganizationSlugUniqueViolation(error)) {
        slugOffset += 1
        continue
      }

      if (isUniqueConstraintViolation(error)) {
        throw new OrganizationProvisioningError(
          "PROVISIONING_FAILED",
          "Unable to create the organization. Please try again.",
        )
      }

      throw new OrganizationProvisioningError(
        "PROVISIONING_FAILED",
        "Unable to create the organization. Please try again.",
      )
    }
  }

  throw new OrganizationProvisioningError(
    "PROVISIONING_FAILED",
    "Unable to create the organization. Please try again.",
  )
}

async function rejectIfAlreadyMember(orm: PublicOrm, authProviderId: string) {
  const user = await orm.public.User.where({ authProviderId }).first()

  if (!user) {
    return
  }

  await rejectIfAlreadyMemberByUserId(orm, user.id)
}

async function rejectIfAlreadyMemberByUserId(orm: PublicOrm, userId: string) {
  const membership = await orm.public.OrganizationMember.where({
    userId,
    status: "ACTIVE",
  }).first()

  if (membership) {
    throw new OrganizationProvisioningError(
      "ALREADY_MEMBER",
      "You already belong to an organization.",
    )
  }
}

async function allocateOrganizationSlug(
  orm: PublicOrm,
  baseSlug: string,
  offset: number,
) {
  for (let attempt = 1 + offset; attempt <= 100 + offset; attempt += 1) {
    const candidate = organizationSlugCandidate(baseSlug, attempt)
    const existing = await orm.public.Organization.where({ slug: candidate }).first()

    if (!existing) {
      return candidate
    }
  }

  throw new OrganizationProvisioningError(
    "PROVISIONING_FAILED",
    "Unable to create the organization. Please try again.",
  )
}
