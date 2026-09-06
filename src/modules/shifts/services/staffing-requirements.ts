import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { ShiftError } from "@/modules/shifts/errors"
import { recordUserAudit } from "@/modules/audit/services/record"
import type {
  CreateStaffingRequirementInput,
  StaffingRequirementIdInput,
  UpdateStaffingRequirementInput,
} from "@/modules/shifts/schemas/staffing-requirement"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm
type TxClient = { orm: typeof db.orm }

async function requireShiftAccess(permission: Permission) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw new ShiftError("UNAUTHENTICATED", "You must be signed in to manage shifts.")
  }

  const authorized = await hasPermission(membership, permission)

  if (!authorized) {
    throw new ShiftError("FORBIDDEN", "You do not have permission to perform this action.")
  }

  return membership
}

function sortByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name))
}

async function findOwnedRequirement(organizationId: string, requirementId: string) {
  return db.orm.public.StaffingRequirement.where({
    id: requirementId,
    organizationId,
  }).first()
}

async function findOwnedDepartment(orm: PublicOrm, organizationId: string, departmentId: string) {
  return orm.public.Department.where({
    id: departmentId,
    organizationId,
  }).first()
}

async function findOwnedShiftType(orm: PublicOrm, organizationId: string, shiftTypeId: string) {
  return orm.public.ShiftType.where({
    id: shiftTypeId,
    organizationId,
  }).first()
}

async function assertAssignableDepartment(
  orm: PublicOrm,
  organizationId: string,
  departmentId: string,
) {
  const department = await findOwnedDepartment(orm, organizationId, departmentId)

  if (!department) {
    throw new ShiftError("NOT_FOUND", "Department not found.")
  }

  return department
}

async function assertAssignableShiftType(
  orm: PublicOrm,
  organizationId: string,
  shiftTypeId: string,
  currentShiftTypeId?: string,
) {
  const shiftType = await findOwnedShiftType(orm, organizationId, shiftTypeId)

  if (!shiftType) {
    throw new ShiftError("NOT_FOUND", "Shift not found.")
  }

  if (!shiftType.isActive && shiftType.id !== currentShiftTypeId) {
    throw new ShiftError("CONFLICT", "This shift is not active.")
  }

  return shiftType
}

async function assertAssignableProfession(
  orm: PublicOrm,
  organizationId: string,
  professionId: string,
  currentProfessionId?: string,
) {
  const owned = await orm.public.Profession.where({
    id: professionId,
    organizationId,
  }).first()

  if (owned) {
    if (!owned.isActive && owned.id !== currentProfessionId) {
      throw new ShiftError("CONFLICT", "This profession is not active.")
    }

    return owned
  }

  const globalProfession = await orm.public.Profession.where({
    id: professionId,
    organizationId: null,
  }).first()

  if (globalProfession) {
    if (!globalProfession.isActive && globalProfession.id !== currentProfessionId) {
      throw new ShiftError("CONFLICT", "This profession is not active.")
    }

    return globalProfession
  }

  throw new ShiftError("NOT_FOUND", "Profession not found.")
}

async function assertUniqueRequirement(
  organizationId: string,
  input: {
    departmentId: string
    shiftTypeId: string
    professionId: string
  },
  excludeId?: string,
) {
  const existing = await db.orm.public.StaffingRequirement.where({
    organizationId,
    departmentId: input.departmentId,
    shiftTypeId: input.shiftTypeId,
    professionId: input.professionId,
  }).first()

  if (existing && existing.id !== excludeId) {
    throw new ShiftError(
      "DUPLICATE",
      "A staffing requirement for this department, shift, and profession already exists.",
    )
  }
}

async function loadRequirementNames(
  organizationId: string,
  requirement: {
    id: string
    organizationId: string
    departmentId: string
    shiftTypeId: string
    professionId: string
    requiredCount: number
  },
) {
  const [department, shiftType, profession] = await Promise.all([
    findOwnedDepartment(db.orm, organizationId, requirement.departmentId),
    findOwnedShiftType(db.orm, organizationId, requirement.shiftTypeId),
    db.orm.public.Profession.where({ id: requirement.professionId }).first(),
  ])

  return {
    ...requirement,
    departmentName: department?.name ?? "Unknown department",
    shiftTypeName: shiftType?.name ?? "Unknown shift",
    shiftTypeIsActive: shiftType?.isActive ?? false,
    professionName: profession?.name ?? "Unknown profession",
  }
}

export async function listShiftFormOptions() {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw new ShiftError("UNAUTHENTICATED", "You must be signed in to manage shifts.")
  }

  const [canView, canCreate, canEdit] = await Promise.all([
    hasPermission(membership, permissions.shiftView),
    hasPermission(membership, permissions.shiftCreate),
    hasPermission(membership, permissions.shiftEdit),
  ])

  if (!canView && !canCreate && !canEdit) {
    throw new ShiftError("FORBIDDEN", "You do not have permission to perform this action.")
  }

  const [departments, shiftTypes, global, organization] = await Promise.all([
    db.orm.public.Department.where({ organizationId: membership.organizationId }).all(),
    db.orm.public.ShiftType.where({ organizationId: membership.organizationId }).all(),
    db.orm.public.Profession.where({ organizationId: null }).all(),
    db.orm.public.Profession.where({ organizationId: membership.organizationId }).all(),
  ])

  return {
    departments: sortByName(departments),
    shiftTypes: sortByName(shiftTypes),
    professions: {
      global: sortByName(global),
      organization: sortByName(organization),
    },
  }
}

export async function listStaffingRequirements() {
  const membership = await requireShiftAccess(permissions.shiftView)
  const requirements = await db.orm.public.StaffingRequirement.where({
    organizationId: membership.organizationId,
  }).all()

  const named = await Promise.all(
    requirements.map((requirement) => loadRequirementNames(membership.organizationId, requirement)),
  )

  return named.sort((left, right) => {
    const department = left.departmentName.localeCompare(right.departmentName)
    if (department !== 0) {
      return department
    }

    const shift = left.shiftTypeName.localeCompare(right.shiftTypeName)
    if (shift !== 0) {
      return shift
    }

    return left.professionName.localeCompare(right.professionName)
  })
}

export async function listDepartmentStaffingRequirements(departmentId: string) {
  const membership = await requireShiftAccess(permissions.shiftView)
  const department = await findOwnedDepartment(db.orm, membership.organizationId, departmentId)

  if (!department) {
    throw new ShiftError("NOT_FOUND", "Department not found.")
  }

  const requirements = await db.orm.public.StaffingRequirement.where({
    organizationId: membership.organizationId,
    departmentId: department.id,
  }).all()

  const named = await Promise.all(
    requirements.map((requirement) => loadRequirementNames(membership.organizationId, requirement)),
  )

  return named.sort((left, right) => {
    const shift = left.shiftTypeName.localeCompare(right.shiftTypeName)
    if (shift !== 0) {
      return shift
    }

    return left.professionName.localeCompare(right.professionName)
  })
}

export async function getStaffingRequirement(requirementId: string) {
  const membership = await requireShiftAccess(permissions.shiftView)
  const requirement = await findOwnedRequirement(membership.organizationId, requirementId)

  if (!requirement) {
    throw new ShiftError("NOT_FOUND", "Staffing requirement not found.")
  }

  return loadRequirementNames(membership.organizationId, requirement)
}

export async function createStaffingRequirement(input: CreateStaffingRequirementInput) {
  const membership = await requireShiftAccess(permissions.shiftCreate)
  const organizationId = membership.organizationId

  await assertAssignableDepartment(db.orm, organizationId, input.departmentId)
  await assertAssignableShiftType(db.orm, organizationId, input.shiftTypeId)
  await assertAssignableProfession(db.orm, organizationId, input.professionId)
  await assertUniqueRequirement(organizationId, input)

  try {
    return await db.transaction(async (tx: TxClient) => {
      const created = await tx.orm.public.StaffingRequirement.create({
        organizationId,
        departmentId: input.departmentId,
        shiftTypeId: input.shiftTypeId,
        professionId: input.professionId,
        requiredCount: input.requiredCount,
      })

      await recordUserAudit(tx, membership, {
        action: "STAFFING_REQUIREMENT_CREATED",
        entityType: "STAFFING_REQUIREMENT",
        entityId: String(created.id),
        summary: "Created staffing requirement.",
        metadata: {
          after: {
            departmentId: created.departmentId,
            shiftTypeId: created.shiftTypeId,
            professionId: created.professionId,
            requiredCount: created.requiredCount,
          },
        },
      })

      return created
    })
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new ShiftError(
        "DUPLICATE",
        "A staffing requirement for this department, shift, and profession already exists.",
      )
    }

    throw new ShiftError("FAILED", "Unable to create the staffing requirement. Please try again.")
  }
}

export async function updateStaffingRequirement(input: UpdateStaffingRequirementInput) {
  const membership = await requireShiftAccess(permissions.shiftEdit)
  const existing = await findOwnedRequirement(membership.organizationId, input.id)

  if (!existing) {
    throw new ShiftError("NOT_FOUND", "Staffing requirement not found.")
  }

  await assertAssignableDepartment(db.orm, membership.organizationId, input.departmentId)
  await assertAssignableShiftType(
    db.orm,
    membership.organizationId,
    input.shiftTypeId,
    existing.shiftTypeId,
  )
  await assertAssignableProfession(
    db.orm,
    membership.organizationId,
    input.professionId,
    existing.professionId,
  )
  await assertUniqueRequirement(membership.organizationId, input, existing.id)

  try {
    return await db.transaction(async (tx: TxClient) => {
      const updated = await tx.orm.public.StaffingRequirement.where({
        id: existing.id,
        organizationId: membership.organizationId,
      }).update({
        departmentId: input.departmentId,
        shiftTypeId: input.shiftTypeId,
        professionId: input.professionId,
        requiredCount: input.requiredCount,
      })

      if (!updated) {
        throw new ShiftError("NOT_FOUND", "Staffing requirement not found.")
      }

      await recordUserAudit(tx, membership, {
        action: "STAFFING_REQUIREMENT_UPDATED",
        entityType: "STAFFING_REQUIREMENT",
        entityId: String(updated.id),
        summary: "Updated staffing requirement.",
        metadata: {
          changedFields: ["departmentId", "shiftTypeId", "professionId", "requiredCount"],
          before: {
            departmentId: existing.departmentId,
            shiftTypeId: existing.shiftTypeId,
            professionId: existing.professionId,
            requiredCount: existing.requiredCount,
          },
          after: {
            departmentId: updated.departmentId,
            shiftTypeId: updated.shiftTypeId,
            professionId: updated.professionId,
            requiredCount: updated.requiredCount,
          },
        },
      })

      return updated
    })
  } catch (error) {
    if (error instanceof ShiftError) {
      throw error
    }

    if (isUniqueConstraintViolation(error)) {
      throw new ShiftError(
        "DUPLICATE",
        "A staffing requirement for this department, shift, and profession already exists.",
      )
    }

    throw new ShiftError("FAILED", "Unable to update the staffing requirement. Please try again.")
  }
}

export async function deleteStaffingRequirement(input: StaffingRequirementIdInput) {
  const membership = await requireShiftAccess(permissions.shiftDeactivate)
  const existing = await findOwnedRequirement(membership.organizationId, input.id)

  if (!existing) {
    throw new ShiftError("NOT_FOUND", "Staffing requirement not found.")
  }

  return db.transaction(async (tx: TxClient) => {
    const deleted = await tx.orm.public.StaffingRequirement.where({
      id: existing.id,
      organizationId: membership.organizationId,
    }).delete()

    if (!deleted) {
      throw new ShiftError("NOT_FOUND", "Staffing requirement not found.")
    }

    await recordUserAudit(tx, membership, {
      action: "STAFFING_REQUIREMENT_DELETED",
      entityType: "STAFFING_REQUIREMENT",
      entityId: String(deleted.id),
      summary: "Deleted staffing requirement.",
      metadata: {
        before: {
          departmentId: deleted.departmentId,
          shiftTypeId: deleted.shiftTypeId,
          professionId: deleted.professionId,
          requiredCount: deleted.requiredCount,
        },
      },
    })

    return deleted
  })
}
