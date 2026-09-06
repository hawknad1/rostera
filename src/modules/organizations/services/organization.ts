import { auditChangedFields } from "@/modules/audit/sanitize"
import { recordUserAudit } from "@/modules/audit/services/record"
import { permissions } from "@/lib/permissions/permissions"
import { organizationAdminError } from "@/modules/organizations/errors"
import type { UpdateOrganizationInput } from "@/modules/organizations/schemas/admin"
import { requireOrgPermission } from "@/modules/organizations/services/access"
import { db } from "@/prisma/db"

const ORGANIZATION_FIELDS = [
  "name",
  "organizationType",
  "phone",
  "email",
  "address",
  "city",
  "region",
  "country",
  "timezone",
] as const

export async function updateOrganizationSettings(input: UpdateOrganizationInput) {
  const membership = await requireOrgPermission(permissions.organizationEdit)
  const organizationId = membership.organizationId

  const existing = await db.orm.public.Organization.where({ id: organizationId }).first()

  if (!existing || existing.id !== organizationId) {
    throw organizationAdminError("ORGANIZATION_NOT_FOUND")
  }

  const before = {
    name: existing.name,
    organizationType: existing.organizationType,
    phone: existing.phone,
    email: existing.email,
    address: existing.address,
    city: existing.city,
    region: existing.region,
    country: existing.country,
    timezone: existing.timezone,
  }

  const after = {
    name: input.name,
    organizationType: input.organizationType,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    region: input.region ?? null,
    country: input.country,
    timezone: input.timezone,
  }

  const changed = auditChangedFields(before, after, ORGANIZATION_FIELDS)

  if (changed.changedFields.length === 0) {
    return existing
  }

  return db.transaction(async (tx) => {
    const updated = await tx.orm.public.Organization.where({ id: organizationId }).update({
      name: input.name,
      organizationType: input.organizationType,
      country: input.country,
      timezone: input.timezone,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      region: input.region ?? null,
    })

    if (!updated) {
      throw organizationAdminError("ORGANIZATION_NOT_FOUND")
    }

    await recordUserAudit(tx, membership, {
      action: "ORGANIZATION_UPDATED",
      entityType: "ORGANIZATION",
      entityId: organizationId,
      summary: "Updated organization settings.",
      metadata: changed,
    })

    return updated
  })
}

export async function suspendOrganization() {
  const membership = await requireOrgPermission(permissions.organizationSuspend, {
    allowSuspended: true,
  })
  const organizationId = membership.organizationId
  const existing = await db.orm.public.Organization.where({ id: organizationId }).first()

  if (!existing) {
    throw organizationAdminError("ORGANIZATION_NOT_FOUND")
  }

  if (existing.status === "SUSPENDED") {
    return existing
  }

  if (existing.status !== "ACTIVE") {
    throw organizationAdminError("FORBIDDEN")
  }

  return db.transaction(async (tx) => {
    const updated = await tx.orm.public.Organization.where({
      id: organizationId,
      status: "ACTIVE",
    }).update({
      status: "SUSPENDED",
    })

    if (!updated) {
      throw organizationAdminError("FAILED")
    }

    await recordUserAudit(tx, membership, {
      action: "ORGANIZATION_SUSPENDED",
      entityType: "ORGANIZATION",
      entityId: organizationId,
      summary: "Suspended the organization.",
    })

    return updated
  })
}

export async function reactivateOrganization() {
  const membership = await requireOrgPermission(permissions.organizationSuspend, {
    allowSuspended: true,
  })
  const organizationId = membership.organizationId
  const existing = await db.orm.public.Organization.where({ id: organizationId }).first()

  if (!existing) {
    throw organizationAdminError("ORGANIZATION_NOT_FOUND")
  }

  if (existing.status === "ACTIVE") {
    return existing
  }

  if (existing.status !== "SUSPENDED") {
    throw organizationAdminError("FORBIDDEN")
  }

  return db.transaction(async (tx) => {
    const updated = await tx.orm.public.Organization.where({
      id: organizationId,
      status: "SUSPENDED",
    }).update({
      status: "ACTIVE",
    })

    if (!updated) {
      throw organizationAdminError("FAILED")
    }

    await recordUserAudit(tx, membership, {
      action: "ORGANIZATION_REACTIVATED",
      entityType: "ORGANIZATION",
      entityId: organizationId,
      summary: "Reactivated the organization.",
    })

    return updated
  })
}
