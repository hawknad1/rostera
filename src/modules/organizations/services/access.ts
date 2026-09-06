import { hasPermission } from "@/lib/auth/has-permission"
import {
  getCurrentMembership,
  resolveMembership,
  type CurrentMembership,
} from "@/lib/auth/get-current-membership"
import type { Permission } from "@/lib/permissions/permissions"
import { organizationAdminError } from "@/modules/organizations/errors"

export async function requireOrgPermission(
  permission: Permission,
  options: { allowSuspended?: boolean } = {},
): Promise<CurrentMembership> {
  if (options.allowSuspended) {
    const resolved = await resolveMembership()

    if (resolved.status === "unauthenticated") {
      throw organizationAdminError("UNAUTHENTICATED")
    }

    if (resolved.status === "no_membership" || resolved.status === "needs_selection") {
      throw organizationAdminError("FORBIDDEN")
    }

    const membership = resolved.membership

    if (!(await hasPermission(membership, permission))) {
      throw organizationAdminError("FORBIDDEN")
    }

    return membership
  }

  const membership = await getCurrentMembership()

  if (membership) {
    if (!(await hasPermission(membership, permission))) {
      throw organizationAdminError("FORBIDDEN")
    }

    return membership
  }

  const resolved = await resolveMembership()

  if (resolved.status === "unauthenticated") {
    throw organizationAdminError("UNAUTHENTICATED")
  }

  if (resolved.status === "suspended") {
    throw organizationAdminError("ORGANIZATION_SUSPENDED")
  }

  if (resolved.status === "no_membership") {
    throw organizationAdminError("MEMBERSHIP_INACTIVE")
  }

  throw organizationAdminError("FORBIDDEN")
}
