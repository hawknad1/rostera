import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { DepartmentError } from "@/modules/departments/errors"
import type {
  CreateDepartmentInput,
  DepartmentIdInput,
  UpdateDepartmentInput,
} from "@/modules/departments/schemas/department"
import { db } from "@/prisma/db"

async function requireDepartmentAccess(permission: Permission) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw new DepartmentError(
      "UNAUTHENTICATED",
      "You must be signed in to manage departments.",
    )
  }

  const authorized = await hasPermission(membership, permission)

  if (!authorized) {
    throw new DepartmentError(
      "FORBIDDEN",
      "You do not have permission to perform this action.",
    )
  }

  return membership
}

async function findOwnedDepartment(organizationId: string, departmentId: string) {
  return db.orm.public.Department.where({
    id: departmentId,
    organizationId,
  }).first()
}

function sortByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name))
}

export async function listDepartments() {
  const membership = await requireDepartmentAccess(permissions.departmentView)

  const departments = await db.orm.public.Department.where({
    organizationId: membership.organizationId,
  }).all()

  return sortByName(departments)
}

export async function getDepartment(departmentId: string) {
  const membership = await requireDepartmentAccess(permissions.departmentView)
  const department = await findOwnedDepartment(membership.organizationId, departmentId)

  if (!department) {
    throw new DepartmentError("NOT_FOUND", "Department not found.")
  }

  return department
}

export async function createDepartment(input: CreateDepartmentInput) {
  const membership = await requireDepartmentAccess(permissions.departmentCreate)
  const { name, description } = input

  try {
    return await db.orm.public.Department.create({
      organizationId: membership.organizationId,
      name,
      ...(description ? { description } : {}),
    })
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new DepartmentError(
        "DUPLICATE",
        "A department with this name already exists.",
      )
    }

    throw new DepartmentError("FAILED", "Unable to create the department. Please try again.")
  }
}

export async function updateDepartment(input: UpdateDepartmentInput) {
  const membership = await requireDepartmentAccess(permissions.departmentEdit)
  const existing = await findOwnedDepartment(membership.organizationId, input.id)

  if (!existing) {
    throw new DepartmentError("NOT_FOUND", "Department not found.")
  }

  try {
    const updated = await db.orm.public.Department.where({
      id: existing.id,
      organizationId: membership.organizationId,
    }).update({
      name: input.name,
      description: input.description ?? null,
    })

    if (!updated) {
      throw new DepartmentError("NOT_FOUND", "Department not found.")
    }

    return updated
  } catch (error) {
    if (error instanceof DepartmentError) {
      throw error
    }

    if (isUniqueConstraintViolation(error)) {
      throw new DepartmentError(
        "DUPLICATE",
        "A department with this name already exists.",
      )
    }

    throw new DepartmentError("FAILED", "Unable to update the department. Please try again.")
  }
}

export async function deleteDepartment(input: DepartmentIdInput) {
  const membership = await requireDepartmentAccess(permissions.departmentDelete)
  const existing = await findOwnedDepartment(membership.organizationId, input.id)

  if (!existing) {
    throw new DepartmentError("NOT_FOUND", "Department not found.")
  }

  const staff = await db.orm.public.StaffProfile.where({
    departmentId: existing.id,
    organizationId: membership.organizationId,
  }).first()

  if (staff) {
    throw new DepartmentError(
      "IN_USE",
      "This department cannot be deleted because it is assigned to staff.",
    )
  }

  const requirement = await db.orm.public.StaffingRequirement.where({
    departmentId: existing.id,
    organizationId: membership.organizationId,
  }).first()

  if (requirement) {
    throw new DepartmentError(
      "IN_USE",
      "This department cannot be deleted because it has staffing requirements.",
    )
  }

  const roster = await db.orm.public.Roster.where({
    departmentId: existing.id,
    organizationId: membership.organizationId,
  }).first()

  if (roster) {
    throw new DepartmentError(
      "IN_USE",
      "This department cannot be deleted because it has rosters.",
    )
  }

  const deleted = await db.orm.public.Department.where({
    id: existing.id,
    organizationId: membership.organizationId,
  }).delete()

  if (!deleted) {
    throw new DepartmentError("NOT_FOUND", "Department not found.")
  }

  return deleted
}
