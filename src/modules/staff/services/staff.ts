import { Temporal } from "temporal-polyfill"

import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import type { Permission } from "@/lib/permissions/permissions"
import { permissions } from "@/lib/permissions/permissions"
import { StaffError } from "@/modules/staff/errors"
import { quoteAuditName } from "@/modules/audit/copy"
import { recordUserAudit } from "@/modules/audit/services/record"
import { formatStaffName } from "@/modules/staff/labels"
import type {
  AssignDepartmentHeadInput,
  CreateStaffInput,
  DepartmentHeadInput,
  LinkStaffToUserInput,
  StaffIdInput,
  UnlinkStaffFromUserInput,
  UpdateStaffInput,
} from "@/modules/staff/schemas/staff"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm
type TxClient = { orm: PublicOrm }

async function requireStaffAccess(permission: Permission) {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw new StaffError("UNAUTHENTICATED", "You must be signed in to manage staff.")
  }

  const authorized = await hasPermission(membership, permission)

  if (!authorized) {
    throw new StaffError("FORBIDDEN", "You do not have permission to perform this action.")
  }

  return membership
}

function sortByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name))
}

function sortStaff<
  T extends { lastName: string; firstName: string; staffNumber: string },
>(rows: T[]) {
  return [...rows].sort((left, right) => {
    const last = left.lastName.localeCompare(right.lastName)
    if (last !== 0) {
      return last
    }

    const first = left.firstName.localeCompare(right.firstName)
    if (first !== 0) {
      return first
    }

    return left.staffNumber.localeCompare(right.staffNumber)
  })
}

function toDateJoined(value: string | null | undefined) {
  if (!value) {
    return undefined
  }

  return Temporal.Instant.from(`${value}T00:00:00.000Z`)
}

async function findOwnedStaff(orm: PublicOrm, organizationId: string, staffId: string) {
  return orm.public.StaffProfile.where({
    id: staffId,
    organizationId,
  }).first()
}

async function findOwnedDepartment(orm: PublicOrm, organizationId: string, departmentId: string) {
  return orm.public.Department.where({
    id: departmentId,
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
    throw new StaffError("NOT_FOUND", "Department not found.")
  }

  return department
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
      throw new StaffError("CONFLICT", "This profession is not active.")
    }

    return owned
  }

  const globalProfession = await orm.public.Profession.where({
    id: professionId,
    organizationId: null,
  }).first()

  if (globalProfession) {
    if (!globalProfession.isActive && globalProfession.id !== currentProfessionId) {
      throw new StaffError("CONFLICT", "This profession is not active.")
    }

    return globalProfession
  }

  throw new StaffError("NOT_FOUND", "Profession not found.")
}

async function assertUniqueStaffNumber(
  orm: PublicOrm,
  organizationId: string,
  staffNumber: string,
  excludeId?: string,
) {
  const existing = await orm.public.StaffProfile.where({ organizationId }).all()
  const duplicate = existing.find(
    (staff) =>
      staff.id !== excludeId &&
      staff.staffNumber.toLowerCase() === staffNumber.toLowerCase(),
  )

  if (duplicate) {
    throw new StaffError(
      "DUPLICATE",
      "A staff member with this staff number already exists.",
    )
  }
}

async function findHeadedDepartment(orm: PublicOrm, organizationId: string, staffId: string) {
  return orm.public.Department.where({
    organizationId,
    headStaffId: staffId,
  }).first()
}

async function clearHeadedDepartment(
  orm: PublicOrm,
  organizationId: string,
  staffId: string,
) {
  const headed = await findHeadedDepartment(orm, organizationId, staffId)

  if (!headed) {
    return null
  }

  return orm.public.Department.where({
    id: headed.id,
    organizationId,
  }).update({
    headStaffId: null,
  })
}

async function loadProfessionMap(organizationId: string) {
  const [global, organization] = await Promise.all([
    db.orm.public.Profession.where({ organizationId: null }).all(),
    db.orm.public.Profession.where({ organizationId }).all(),
  ])

  return new Map([...global, ...organization].map((profession) => [profession.id, profession]))
}

export async function listStaff() {
  const membership = await requireStaffAccess(permissions.staffView)
  const organizationId = membership.organizationId

  const [staff, departments, professions] = await Promise.all([
    db.orm.public.StaffProfile.where({ organizationId }).all(),
    db.orm.public.Department.where({ organizationId }).all(),
    loadProfessionMap(organizationId),
  ])

  const departmentsById = new Map(departments.map((department) => [department.id, department]))
  const headStaffIds = new Set(
    departments
      .map((department) => department.headStaffId)
      .filter((id): id is string => Boolean(id)),
  )

  return sortStaff(staff).map((member) => ({
    ...member,
    departmentName: departmentsById.get(member.departmentId)?.name ?? "Unknown department",
    professionName: professions.get(member.professionId)?.name ?? "Unknown profession",
    hasRosteraLogin: Boolean(member.userId),
    isDepartmentHead: headStaffIds.has(member.id),
  }))
}

export async function getStaff(staffId: string) {
  const membership = await requireStaffAccess(permissions.staffView)
  const staff = await findOwnedStaff(db.orm, membership.organizationId, staffId)

  if (!staff) {
    throw new StaffError("NOT_FOUND", "Staff member not found.")
  }

  const [department, profession, headedDepartment] = await Promise.all([
    findOwnedDepartment(db.orm, membership.organizationId, staff.departmentId),
    db.orm.public.Profession.where({ id: staff.professionId }).first(),
    findHeadedDepartment(db.orm, membership.organizationId, staff.id),
  ])

  return {
    ...staff,
    departmentName: department?.name ?? "Unknown department",
    professionName: profession?.name ?? "Unknown profession",
    headedDepartmentName: headedDepartment?.name ?? null,
    hasRosteraLogin: Boolean(staff.userId),
    isDepartmentHead: Boolean(headedDepartment),
  }
}

export async function listStaffFormOptions() {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw new StaffError("UNAUTHENTICATED", "You must be signed in to manage staff.")
  }

  const [canView, canCreate, canEdit] = await Promise.all([
    hasPermission(membership, permissions.staffView),
    hasPermission(membership, permissions.staffCreate),
    hasPermission(membership, permissions.staffEdit),
  ])

  if (!canView && !canCreate && !canEdit) {
    throw new StaffError("FORBIDDEN", "You do not have permission to perform this action.")
  }

  const [departments, global, organization] = await Promise.all([
    db.orm.public.Department.where({ organizationId: membership.organizationId }).all(),
    db.orm.public.Profession.where({ organizationId: null }).all(),
    db.orm.public.Profession.where({ organizationId: membership.organizationId }).all(),
  ])

  return {
    departments: sortByName(departments),
    professions: {
      global: sortByName(global),
      organization: sortByName(organization),
    },
  }
}

export async function listAssignableDepartmentHeads(departmentId: string) {
  const membership = await requireStaffAccess(permissions.staffEdit)
  const department = await findOwnedDepartment(db.orm, membership.organizationId, departmentId)

  if (!department) {
    throw new StaffError("NOT_FOUND", "Department not found.")
  }

  const staff = await db.orm.public.StaffProfile.where({
    organizationId: membership.organizationId,
    departmentId: department.id,
    employmentStatus: "ACTIVE",
  }).all()

  return sortStaff(staff)
}

export async function createStaff(input: CreateStaffInput) {
  const membership = await requireStaffAccess(permissions.staffCreate)
  const organizationId = membership.organizationId

  await assertAssignableDepartment(db.orm, organizationId, input.departmentId)
  await assertAssignableProfession(db.orm, organizationId, input.professionId)
  await assertUniqueStaffNumber(db.orm, organizationId, input.staffNumber)

  try {
    return await db.transaction(async (tx: TxClient) => {
      const created = await tx.orm.public.StaffProfile.create({
        organizationId,
        staffNumber: input.staffNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        professionId: input.professionId,
        departmentId: input.departmentId,
        employmentStatus: input.employmentStatus,
        employmentType: input.employmentType,
        ...(input.middleName ? { middleName: input.middleName } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
        ...(input.dateJoined ? { dateJoined: toDateJoined(input.dateJoined) } : {}),
      })

      await recordUserAudit(tx, membership, {
        action: "STAFF_CREATED",
        entityType: "STAFF",
        entityId: String(created.id),
        summary: `Created staff member ${quoteAuditName(formatStaffName(input))}.`,
        metadata: {
          after: {
            staffNumber: created.staffNumber,
            firstName: created.firstName,
            lastName: created.lastName,
            departmentId: created.departmentId,
            professionId: created.professionId,
            employmentStatus: created.employmentStatus,
            employmentType: created.employmentType,
          },
        },
      })

      return created
    })
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new StaffError(
        "DUPLICATE",
        "A staff member with this staff number already exists.",
      )
    }

    throw new StaffError("FAILED", "Unable to create the staff member. Please try again.")
  }
}

export async function updateStaff(input: UpdateStaffInput) {
  const membership = await requireStaffAccess(permissions.staffEdit)
  const organizationId = membership.organizationId
  const existing = await findOwnedStaff(db.orm, organizationId, input.id)

  if (!existing) {
    throw new StaffError("NOT_FOUND", "Staff member not found.")
  }

  await assertAssignableDepartment(db.orm, organizationId, input.departmentId)
  await assertAssignableProfession(
    db.orm,
    organizationId,
    input.professionId,
    existing.professionId,
  )

  const departmentChanged = existing.departmentId !== input.departmentId

  const staffFields = {
    firstName: input.firstName,
    middleName: input.middleName ?? null,
    lastName: input.lastName,
    phone: input.phone ?? null,
    email: input.email ?? null,
    professionId: input.professionId,
    departmentId: input.departmentId,
    employmentStatus: input.employmentStatus,
    employmentType: input.employmentType,
    dateJoined: input.dateJoined ? toDateJoined(input.dateJoined) : null,
    photoUrl: input.photoUrl ?? null,
  }

  try {
    const updated = await db.transaction(async (tx: TxClient) => {
      if (departmentChanged) {
        await clearHeadedDepartment(tx.orm, organizationId, existing.id)
      }

      const next = await tx.orm.public.StaffProfile.where({
        id: existing.id,
        organizationId,
      }).update(staffFields)

      if (!next) {
        throw new StaffError("NOT_FOUND", "Staff member not found.")
      }

      await recordUserAudit(tx, membership, {
        action: "STAFF_UPDATED",
        entityType: "STAFF",
        entityId: String(next.id),
        summary: `Updated staff member ${quoteAuditName(formatStaffName(input))}.`,
        metadata: {
          changedFields: [
            "firstName",
            "lastName",
            "departmentId",
            "professionId",
            "employmentStatus",
            "employmentType",
          ],
          before: {
            firstName: existing.firstName,
            lastName: existing.lastName,
            departmentId: existing.departmentId,
            professionId: existing.professionId,
            employmentStatus: existing.employmentStatus,
            employmentType: existing.employmentType,
          },
          after: {
            firstName: next.firstName,
            lastName: next.lastName,
            departmentId: next.departmentId,
            professionId: next.professionId,
            employmentStatus: next.employmentStatus,
            employmentType: next.employmentType,
          },
        },
      })

      return next
    })

    if (!updated) {
      throw new StaffError("NOT_FOUND", "Staff member not found.")
    }

    return updated
  } catch (error) {
    if (error instanceof StaffError) {
      throw error
    }

    throw new StaffError("FAILED", "Unable to update the staff member. Please try again.")
  }
}

export async function deactivateStaff(input: StaffIdInput) {
  const membership = await requireStaffAccess(permissions.staffDeactivate)
  const organizationId = membership.organizationId
  const existing = await findOwnedStaff(db.orm, organizationId, input.id)

  if (!existing) {
    throw new StaffError("NOT_FOUND", "Staff member not found.")
  }

  try {
    const updated = await db.transaction(async (tx: TxClient) => {
      await clearHeadedDepartment(tx.orm, organizationId, existing.id)

      const next = await tx.orm.public.StaffProfile.where({
        id: existing.id,
        organizationId,
      }).update({
        employmentStatus: "TERMINATED",
      })

      if (!next) {
        throw new StaffError("NOT_FOUND", "Staff member not found.")
      }

      await recordUserAudit(tx, membership, {
        action: "STAFF_DEACTIVATED",
        entityType: "STAFF",
        entityId: String(next.id),
        summary: `Deactivated staff member ${quoteAuditName(
          formatStaffName({
            firstName: String(existing.firstName),
            middleName: existing.middleName == null ? null : String(existing.middleName),
            lastName: String(existing.lastName),
          }),
        )}.`,
        metadata: {
          before: { employmentStatus: existing.employmentStatus },
          after: { employmentStatus: "TERMINATED" },
        },
      })

      return next
    })

    if (!updated) {
      throw new StaffError("NOT_FOUND", "Staff member not found.")
    }

    return updated
  } catch (error) {
    if (error instanceof StaffError) {
      throw error
    }

    throw new StaffError("FAILED", "Unable to deactivate the staff member. Please try again.")
  }
}

export async function assignDepartmentHead(input: AssignDepartmentHeadInput) {
  const membership = await requireStaffAccess(permissions.staffEdit)
  const organizationId = membership.organizationId
  const department = await findOwnedDepartment(db.orm, organizationId, input.departmentId)
  const staff = await findOwnedStaff(db.orm, organizationId, input.staffId)

  if (!department) {
    throw new StaffError("NOT_FOUND", "Department not found.")
  }

  if (!staff) {
    throw new StaffError("NOT_FOUND", "Staff member not found.")
  }

  if (staff.departmentId !== department.id) {
    throw new StaffError(
      "CONFLICT",
      "A department head must belong to that department.",
    )
  }

  if (staff.employmentStatus !== "ACTIVE") {
    throw new StaffError(
      "CONFLICT",
      "Only an active staff member can be assigned as department head.",
    )
  }

  const existingHeadRole = await findHeadedDepartment(db.orm, organizationId, staff.id)

  if (existingHeadRole && existingHeadRole.id !== department.id) {
    throw new StaffError(
      "CONFLICT",
      "This staff member already heads another department.",
    )
  }

  try {
    const updated = await db.transaction(async (tx: TxClient) => {
      const next = await tx.orm.public.Department.where({
        id: department.id,
        organizationId,
      }).update({
        headStaffId: staff.id,
      })

      if (!next) {
        throw new StaffError("NOT_FOUND", "Department not found.")
      }

      await recordUserAudit(tx, membership, {
        action: "DEPARTMENT_HEAD_ASSIGNED",
        entityType: "DEPARTMENT",
        entityId: String(next.id),
        summary: `Assigned department head for ${quoteAuditName(String(department.name))}.`,
        metadata: {
          before: { headStaffId: department.headStaffId ?? null },
          after: { headStaffId: staff.id },
        },
      })

      return next
    })

    if (!updated) {
      throw new StaffError("NOT_FOUND", "Department not found.")
    }

    return updated
  } catch (error) {
    if (error instanceof StaffError) {
      throw error
    }

    if (isUniqueConstraintViolation(error)) {
      throw new StaffError(
        "CONFLICT",
        "This staff member already heads another department.",
      )
    }

    throw new StaffError("FAILED", "Unable to assign the department head. Please try again.")
  }
}

export async function clearDepartmentHead(input: DepartmentHeadInput) {
  const membership = await requireStaffAccess(permissions.staffEdit)
  const organizationId = membership.organizationId
  const department = await findOwnedDepartment(db.orm, organizationId, input.departmentId)

  if (!department) {
    throw new StaffError("NOT_FOUND", "Department not found.")
  }

  const updated = await db.transaction(async (tx: TxClient) => {
    const next = await tx.orm.public.Department.where({
      id: department.id,
      organizationId,
    }).update({
      headStaffId: null,
    })

    if (!next) {
      throw new StaffError("NOT_FOUND", "Department not found.")
    }

    await recordUserAudit(tx, membership, {
      action: "DEPARTMENT_HEAD_REMOVED",
      entityType: "DEPARTMENT",
      entityId: String(next.id),
      summary: `Removed department head for ${quoteAuditName(String(department.name))}.`,
      metadata: {
        before: { headStaffId: department.headStaffId ?? null },
        after: { headStaffId: null },
      },
    })

    return next
  })

  if (!updated) {
    throw new StaffError("NOT_FOUND", "Department not found.")
  }

  return updated
}

export async function linkStaffToUser(input: LinkStaffToUserInput) {
  const membership = await requireStaffAccess(permissions.staffEdit)
  const organizationId = membership.organizationId
  const staff = await findOwnedStaff(db.orm, organizationId, input.staffId)

  if (!staff) {
    throw new StaffError("NOT_FOUND", "Staff member not found.")
  }

  if (staff.userId) {
    throw new StaffError("CONFLICT", "This staff member is already linked to a Rostera account.")
  }

  const userMembership = await db.orm.public.OrganizationMember.where({
    organizationId,
    userId: input.userId,
    status: "ACTIVE",
  }).first()

  if (!userMembership) {
    throw new StaffError("NOT_FOUND", "User not found.")
  }

  try {
    return await db.transaction(async (tx) => {
      const updated = await tx.orm.public.StaffProfile.where({
        id: staff.id,
        organizationId,
      }).update({
        userId: input.userId,
      })

      if (!updated) {
        throw new StaffError("NOT_FOUND", "Staff member not found.")
      }

      await recordUserAudit(tx, membership, {
        action: "STAFF_ACCOUNT_LINKED",
        entityType: "STAFF",
        entityId: staff.id,
        summary: "Linked a workforce profile to an application account.",
        metadata: { userId: input.userId },
      })

      return updated
    })
  } catch (error) {
    if (error instanceof StaffError) {
      throw error
    }

    if (isUniqueConstraintViolation(error)) {
      throw new StaffError("DUPLICATE", "This user is already linked to a staff member.")
    }

    throw new StaffError("FAILED", "Unable to link the staff member. Please try again.")
  }
}

export async function unlinkStaffFromUser(input: UnlinkStaffFromUserInput) {
  const membership = await requireStaffAccess(permissions.staffEdit)
  const organizationId = membership.organizationId
  const staff = await findOwnedStaff(db.orm, organizationId, input.staffId)

  if (!staff) {
    throw new StaffError("NOT_FOUND", "Staff member not found.")
  }

  if (!staff.userId) {
    return staff
  }

  return db.transaction(async (tx) => {
    const updated = await tx.orm.public.StaffProfile.where({
      id: staff.id,
      organizationId,
      userId: staff.userId,
    }).update({
      userId: null,
    })

    if (!updated) {
      throw new StaffError("NOT_FOUND", "Staff member not found.")
    }

    await recordUserAudit(tx, membership, {
      action: "STAFF_ACCOUNT_UNLINKED",
      entityType: "STAFF",
      entityId: staff.id,
      summary: "Unlinked a workforce profile from an application account.",
      metadata: { userId: staff.userId },
    })

    return updated
  })
}
