import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import type { Permission } from "@/lib/permissions/permissions"
import { professionAuthorization } from "@/modules/professions/authorization"
import { ProfessionError } from "@/modules/professions/errors"
import { quoteAuditName } from "@/modules/audit/copy"
import { recordUserAudit } from "@/modules/audit/services/record"
import type {
  CreateProfessionInput,
  ProfessionIdInput,
  UpdateProfessionInput,
} from "@/modules/professions/schemas/profession"
import { db } from "@/prisma/db"

type TxClient = { orm: typeof db.orm }

async function requireProfessionAccess(permission: Permission) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw new ProfessionError(
      "UNAUTHENTICATED",
      "You must be signed in to manage professions.",
    )
  }

  const authorized = await hasPermission(membership, permission)

  if (!authorized) {
    throw new ProfessionError(
      "FORBIDDEN",
      "You do not have permission to perform this action.",
    )
  }

  return membership
}

function sortByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name))
}

async function findOwnedProfession(organizationId: string, professionId: string) {
  return db.orm.public.Profession.where({
    id: professionId,
    organizationId,
  }).first()
}

async function rejectIfNotOwnedProfession(organizationId: string, professionId: string) {
  const owned = await findOwnedProfession(organizationId, professionId)

  if (owned) {
    return owned
  }

  const globalProfession = await db.orm.public.Profession.where({
    id: professionId,
    organizationId: null,
  }).first()

  if (globalProfession) {
    throw new ProfessionError(
      "FORBIDDEN",
      "Global professions cannot be changed by hospital users.",
    )
  }

  throw new ProfessionError("NOT_FOUND", "Profession not found.")
}

async function assertUniqueOrganizationName(
  organizationId: string,
  name: string,
  excludeId?: string,
) {
  const existing = await db.orm.public.Profession.where({
    organizationId,
    name,
  }).first()

  if (existing && existing.id !== excludeId) {
    throw new ProfessionError(
      "DUPLICATE",
      "A profession with this name already exists.",
    )
  }
}

export async function listProfessions() {
  const membership = await requireProfessionAccess(professionAuthorization.view)

  const [global, organization] = await Promise.all([
    db.orm.public.Profession.where({ organizationId: null }).all(),
    db.orm.public.Profession.where({
      organizationId: membership.organizationId,
    }).all(),
  ])

  return {
    global: sortByName(global),
    organization: sortByName(organization),
  }
}

export async function createOrganizationProfession(input: CreateProfessionInput) {
  const membership = await requireProfessionAccess(professionAuthorization.create)
  const { name, description } = input

  await assertUniqueOrganizationName(membership.organizationId, name)

  try {
    return await db.transaction(async (tx: TxClient) => {
      const created = await tx.orm.public.Profession.create({
        organizationId: membership.organizationId,
        name,
        isActive: true,
        ...(description ? { description } : {}),
      })

      await recordUserAudit(tx, membership, {
        action: "PROFESSION_CREATED",
        entityType: "PROFESSION",
        entityId: String(created.id),
        summary: `Created profession ${quoteAuditName(String(created.name))}.`,
        metadata: {
          after: { name: created.name, description: created.description ?? null },
        },
      })

      return created
    })
  } catch {
    throw new ProfessionError("FAILED", "Unable to create the profession. Please try again.")
  }
}

export async function updateOrganizationProfession(input: UpdateProfessionInput) {
  const membership = await requireProfessionAccess(professionAuthorization.edit)
  const existing = await rejectIfNotOwnedProfession(membership.organizationId, input.id)

  await assertUniqueOrganizationName(membership.organizationId, input.name, existing.id)

  try {
    return await db.transaction(async (tx: TxClient) => {
      const updated = await tx.orm.public.Profession.where({
        id: existing.id,
        organizationId: membership.organizationId,
      }).update({
        name: input.name,
        description: input.description ?? null,
      })

      if (!updated) {
        throw new ProfessionError("NOT_FOUND", "Profession not found.")
      }

      await recordUserAudit(tx, membership, {
        action: "PROFESSION_UPDATED",
        entityType: "PROFESSION",
        entityId: String(updated.id),
        summary: `Updated profession ${quoteAuditName(String(updated.name))}.`,
        metadata: {
          changedFields: ["name", "description"],
          before: { name: existing.name, description: existing.description ?? null },
          after: { name: updated.name, description: updated.description ?? null },
        },
      })

      return updated
    })
  } catch (error) {
    if (error instanceof ProfessionError) {
      throw error
    }

    throw new ProfessionError("FAILED", "Unable to update the profession. Please try again.")
  }
}

export async function deactivateOrganizationProfession(input: ProfessionIdInput) {
  const membership = await requireProfessionAccess(professionAuthorization.deactivate)
  const existing = await rejectIfNotOwnedProfession(membership.organizationId, input.id)

  return db.transaction(async (tx: TxClient) => {
    const updated = await tx.orm.public.Profession.where({
      id: existing.id,
      organizationId: membership.organizationId,
    }).update({
      isActive: false,
    })

    if (!updated) {
      throw new ProfessionError("NOT_FOUND", "Profession not found.")
    }

    await recordUserAudit(tx, membership, {
      action: "PROFESSION_DEACTIVATED",
      entityType: "PROFESSION",
      entityId: String(updated.id),
      summary: `Deactivated profession ${quoteAuditName(String(updated.name))}.`,
      metadata: {
        before: { isActive: existing.isActive },
        after: { isActive: false },
      },
    })

    return updated
  })
}
