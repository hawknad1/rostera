import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { getCurrentUser } from "@/lib/auth/get-current-user"
import { staffAppError } from "@/modules/staff-app/errors"
import type {
  LinkedStaffProfile,
  StaffEmploymentStatus,
  StaffIdentity,
  StaffIdentityLinked,
} from "@/modules/staff-app/types"
import { db } from "@/prisma/db"

function asEmploymentStatus(value: unknown): StaffEmploymentStatus {
  if (value === "ACTIVE" || value === "ON_LEAVE" || value === "SUSPENDED" || value === "TERMINATED") {
    return value
  }

  return "ACTIVE"
}

function canMutateEmployment(status: StaffEmploymentStatus) {
  return status === "ACTIVE"
}

async function hydrateLinkedStaff(
  organizationId: string,
  row: {
    id: unknown
    organizationId: unknown
    userId?: unknown
    firstName: unknown
    middleName?: unknown
    lastName: unknown
    staffNumber: unknown
    departmentId: unknown
    employmentStatus: unknown
  },
): Promise<LinkedStaffProfile | null> {
  if (String(row.organizationId) !== organizationId) {
    return null
  }

  if (!row.userId) {
    return null
  }

  const department = await db.orm.public.Department.where({
    id: String(row.departmentId),
    organizationId,
  }).first()

  return {
    id: String(row.id),
    organizationId,
    userId: String(row.userId),
    firstName: String(row.firstName),
    middleName: row.middleName == null ? null : String(row.middleName),
    lastName: String(row.lastName),
    staffNumber: String(row.staffNumber),
    departmentId: String(row.departmentId),
    departmentName: department ? String(department.name) : "Unknown department",
    employmentStatus: asEmploymentStatus(row.employmentStatus),
  }
}

export async function resolveStaffIdentity(): Promise<StaffIdentity> {
  const [user, membership] = await Promise.all([getCurrentUser(), getCurrentMembership()])

  if (!user || !membership) {
    throw staffAppError("UNAUTHENTICATED")
  }

  if (membership.userId !== user.id) {
    throw staffAppError("UNAUTHENTICATED")
  }

  const timeZone = String(membership.organization.timezone)
  const organizationName = String(membership.organization.name)

  const row = await db.orm.public.StaffProfile.where({
    organizationId: membership.organizationId,
    userId: user.id,
  }).first()

  if (!row) {
    return {
      status: "UNLINKED",
      membership,
      user,
      timeZone,
      organizationName,
    }
  }

  const staff = await hydrateLinkedStaff(membership.organizationId, row)

  if (!staff || staff.organizationId !== membership.organizationId || staff.userId !== user.id) {
    return {
      status: "UNLINKED",
      membership,
      user,
      timeZone,
      organizationName,
    }
  }

  return {
    status: "LINKED",
    membership,
    user,
    staff,
    timeZone,
    organizationName,
    canMutate: canMutateEmployment(staff.employmentStatus),
  }
}

export async function requireLinkedStaff(): Promise<StaffIdentityLinked> {
  const identity = await resolveStaffIdentity()

  if (identity.status !== "LINKED") {
    throw staffAppError("STAFF_NOT_LINKED")
  }

  return identity
}

export async function requireMutableStaff(): Promise<StaffIdentityLinked> {
  const identity = await requireLinkedStaff()

  if (identity.staff.employmentStatus === "TERMINATED") {
    throw staffAppError("STAFF_TERMINATED")
  }

  if (!identity.canMutate) {
    throw staffAppError("STAFF_NOT_ACTIVE")
  }

  return identity
}
