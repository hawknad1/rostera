import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { describeShiftDuration, ShiftTimeError } from "@/lib/dates/shift-time"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { ShiftError } from "@/modules/shifts/errors"
import type {
  CreateShiftTypeInput,
  ShiftTypeIdInput,
  UpdateShiftTypeInput,
} from "@/modules/shifts/schemas/shift-type"
import { db } from "@/prisma/db"

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

function withDuration<T extends { startTime: string; endTime: string; isOvernight: boolean }>(
  shift: T,
) {
  const window = describeShiftDuration(shift)
  return {
    ...shift,
    startTime: window.startTime,
    endTime: window.endTime,
    durationMinutes: window.durationMinutes,
    durationLabel: window.durationLabel,
  }
}

async function findOwnedShiftType(organizationId: string, shiftTypeId: string) {
  return db.orm.public.ShiftType.where({
    id: shiftTypeId,
    organizationId,
  }).first()
}

async function assertUniqueShiftName(
  organizationId: string,
  name: string,
  excludeId?: string,
) {
  const existing = await db.orm.public.ShiftType.where({ organizationId }).all()
  const duplicate = existing.find(
    (shift) => shift.id !== excludeId && shift.name.toLowerCase() === name.toLowerCase(),
  )

  if (duplicate) {
    throw new ShiftError("DUPLICATE", "A shift with this name already exists.")
  }
}

function shiftWindowFromInput(input: CreateShiftTypeInput) {
  try {
    return describeShiftDuration(input)
  } catch (error) {
    throw new ShiftError(
      "CONFLICT",
      error instanceof ShiftTimeError || error instanceof Error
        ? error.message
        : "Enter a valid shift window.",
    )
  }
}

export async function listShiftTypes() {
  const membership = await requireShiftAccess(permissions.shiftView)
  const shiftTypes = await db.orm.public.ShiftType.where({
    organizationId: membership.organizationId,
  }).all()

  return sortByName(shiftTypes).map(withDuration)
}

export async function getShiftType(shiftTypeId: string) {
  const membership = await requireShiftAccess(permissions.shiftView)
  const shiftType = await findOwnedShiftType(membership.organizationId, shiftTypeId)

  if (!shiftType) {
    throw new ShiftError("NOT_FOUND", "Shift not found.")
  }

  return withDuration(shiftType)
}

export async function createShiftType(input: CreateShiftTypeInput) {
  const membership = await requireShiftAccess(permissions.shiftCreate)
  const window = shiftWindowFromInput(input)

  await assertUniqueShiftName(membership.organizationId, input.name)

  try {
    const created = await db.orm.public.ShiftType.create({
      organizationId: membership.organizationId,
      name: input.name,
      startTime: window.startTime,
      endTime: window.endTime,
      isOvernight: input.isOvernight,
      isActive: true,
      ...(input.description ? { description: input.description } : {}),
    })

    return withDuration(created)
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new ShiftError("DUPLICATE", "A shift with this name already exists.")
    }

    throw new ShiftError("FAILED", "Unable to create the shift. Please try again.")
  }
}

export async function updateShiftType(input: UpdateShiftTypeInput) {
  const membership = await requireShiftAccess(permissions.shiftEdit)
  const existing = await findOwnedShiftType(membership.organizationId, input.id)

  if (!existing) {
    throw new ShiftError("NOT_FOUND", "Shift not found.")
  }

  const window = shiftWindowFromInput(input)
  await assertUniqueShiftName(membership.organizationId, input.name, existing.id)

  try {
    const updated = await db.orm.public.ShiftType.where({
      id: existing.id,
      organizationId: membership.organizationId,
    }).update({
      name: input.name,
      description: input.description ?? null,
      startTime: window.startTime,
      endTime: window.endTime,
      isOvernight: input.isOvernight,
    })

    if (!updated) {
      throw new ShiftError("NOT_FOUND", "Shift not found.")
    }

    return withDuration(updated)
  } catch (error) {
    if (error instanceof ShiftError) {
      throw error
    }

    if (isUniqueConstraintViolation(error)) {
      throw new ShiftError("DUPLICATE", "A shift with this name already exists.")
    }

    throw new ShiftError("FAILED", "Unable to update the shift. Please try again.")
  }
}

export async function deactivateShiftType(input: ShiftTypeIdInput) {
  const membership = await requireShiftAccess(permissions.shiftDeactivate)
  const existing = await findOwnedShiftType(membership.organizationId, input.id)

  if (!existing) {
    throw new ShiftError("NOT_FOUND", "Shift not found.")
  }

  const updated = await db.orm.public.ShiftType.where({
    id: existing.id,
    organizationId: membership.organizationId,
  }).update({
    isActive: false,
  })

  if (!updated) {
    throw new ShiftError("NOT_FOUND", "Shift not found.")
  }

  return withDuration(updated)
}
