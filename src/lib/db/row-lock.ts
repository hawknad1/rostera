import type { PublicOrm } from "@/modules/audit/types/orm"

export async function lockOrganizationRow(orm: PublicOrm, organizationId: string) {
  const organization = await orm.public.Organization.where({ id: organizationId }).first()

  if (!organization) {
    return null
  }

  await orm.public.Organization.where({ id: organizationId }).update({
    name: organization.name,
  })

  return organization
}

export async function lockStaffRow(orm: PublicOrm, organizationId: string, staffId: string) {
  const staff = await orm.public.StaffProfile.where({
    id: staffId,
    organizationId,
  }).first()

  if (!staff || staff.organizationId !== organizationId) {
    return null
  }

  await orm.public.StaffProfile.where({
    id: staff.id,
    organizationId,
  }).update({
    firstName: staff.firstName,
  })

  return staff
}

export async function lockAssignmentRows(
  orm: PublicOrm,
  organizationId: string,
  assignmentIds: readonly string[],
) {
  const uniqueIds = [...new Set(assignmentIds)].sort()
  const locked = []

  for (const id of uniqueIds) {
    const assignment = await orm.public.ShiftAssignment.where({
      id,
      organizationId,
    }).first()

    if (!assignment || assignment.organizationId !== organizationId) {
      return null
    }

    await orm.public.ShiftAssignment.where({
      id: assignment.id,
      organizationId,
    }).update({
      date: assignment.date,
    })

    locked.push(assignment)
  }

  return locked
}
