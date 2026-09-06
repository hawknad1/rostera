import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import {
  schedulingPolicyError,
  schedulingPolicyErrorMessages,
  SchedulingPolicyError,
} from "@/modules/organizations/errors"
import {
  ensureDefaultSchedulingPolicy,
  toSchedulingPolicyRecord,
} from "@/modules/organizations/services/ensure-scheduling-policy"
import { toSchedulingConfig } from "@/modules/scheduling/policy/to-scheduling-config"
import { schedulingPolicyValuesSchema } from "@/modules/scheduling/schemas/scheduling-policy"
import type { SchedulingPolicyValues } from "@/modules/scheduling/types/scheduling-policy"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm

export { ensureDefaultSchedulingPolicy } from "@/modules/organizations/services/ensure-scheduling-policy"
export type { OrganizationSchedulingPolicyRecord } from "@/modules/organizations/services/ensure-scheduling-policy"

export async function loadOrganizationSchedulingPolicy(orm: PublicOrm, organizationId: string) {
  return ensureDefaultSchedulingPolicy(orm, organizationId)
}

export async function schedulingConfigForOrganization(orm: PublicOrm, organizationId: string) {
  const policy = await loadOrganizationSchedulingPolicy(orm, organizationId)
  return toSchedulingConfig(policy)
}

async function requireSettingsAccess(permission: Permission) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw schedulingPolicyError("UNAUTHENTICATED")
  }

  const authorized = await hasPermission(membership, permission)

  if (!authorized) {
    throw schedulingPolicyError("FORBIDDEN")
  }

  return membership
}

export async function getSchedulingPolicy() {
  const membership = await requireSettingsAccess(permissions.settingsView)
  const organization = await db.orm.public.Organization.where({
    id: membership.organizationId,
  }).first()

  if (!organization) {
    throw schedulingPolicyError("ORGANIZATION_NOT_FOUND")
  }

  return loadOrganizationSchedulingPolicy(db.orm, membership.organizationId)
}

export async function updateSchedulingPolicy(input: SchedulingPolicyValues) {
  const membership = await requireSettingsAccess(permissions.settingsEdit)
  const organizationId = membership.organizationId

  const parsed = schedulingPolicyValuesSchema.safeParse(input)

  if (!parsed.success) {
    throw schedulingPolicyError(
      "INVALID_SCHEDULING_POLICY",
      parsed.error.issues[0]?.message ?? schedulingPolicyErrorMessages.INVALID_SCHEDULING_POLICY,
    )
  }

  const organization = await db.orm.public.Organization.where({ id: organizationId }).first()

  if (!organization) {
    throw schedulingPolicyError("ORGANIZATION_NOT_FOUND")
  }

  try {
    const current = await ensureDefaultSchedulingPolicy(db.orm, organizationId)
    const updated = await db.orm.public.OrganizationSchedulingPolicy.where({
      id: current.id,
      organizationId,
    }).update(parsed.data)

    if (!updated) {
      throw schedulingPolicyError("FAILED")
    }

    return toSchedulingPolicyRecord(updated)
  } catch (error) {
    if (error instanceof SchedulingPolicyError) {
      throw error
    }

    throw schedulingPolicyError("FAILED")
  }
}
