import type { PublicOrm } from "@/modules/notifications/types/orm"
import type {
  DomainNotificationEvent,
  NotificationIntent,
} from "@/modules/notifications/types/notification"
import { entityTypeForNotification } from "@/modules/notifications/deep-links"
import { notificationCopy } from "@/modules/notifications/copy"

const LEAVE_REVIEWER_ROLE_NAMES = new Set(["HR"])
const ROSTER_REVIEWER_ROLE_NAMES = new Set(["ROSTER_MANAGER"])

function uniqueIds(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))]
}

async function activeMemberUserId(
  orm: PublicOrm,
  organizationId: string,
  userId: string | null | undefined,
) {
  if (!userId) {
    return null
  }

  const membership = await orm.public.OrganizationMember.where({
    organizationId,
    userId,
    status: "ACTIVE",
  }).first()

  return membership ? userId : null
}

async function linkedUserIdForStaff(
  orm: PublicOrm,
  organizationId: string,
  staffId: string,
) {
  const staff = await orm.public.StaffProfile.where({
    id: staffId,
    organizationId,
  }).first()

  if (!staff?.userId || staff.organizationId !== organizationId) {
    return null
  }

  return activeMemberUserId(orm, organizationId, String(staff.userId))
}

async function departmentHeadUserId(
  orm: PublicOrm,
  organizationId: string,
  departmentId: string,
) {
  const department = await orm.public.Department.where({
    id: departmentId,
    organizationId,
  }).first()

  if (!department?.headStaffId || department.organizationId !== organizationId) {
    return null
  }

  return linkedUserIdForStaff(orm, organizationId, String(department.headStaffId))
}

async function activeMembersWithRoleNames(
  orm: PublicOrm,
  organizationId: string,
  roleNames: Set<string>,
) {
  const members = await orm.public.OrganizationMember.where({
    organizationId,
    status: "ACTIVE",
  })
    .include("role")
    .all()

  return uniqueIds(
    members
      .filter((member) => {
        const role = member.role as { name?: unknown; organizationId?: unknown } | null
        return (
          Boolean(role) &&
          roleNames.has(String(role?.name)) &&
          role?.organizationId === organizationId
        )
      })
      .map((member) => String(member.userId)),
  )
}

async function resolveRecipientUserIds(orm: PublicOrm, event: DomainNotificationEvent) {
  switch (event.type) {
    case "LEAVE_REQUESTED": {
      const staff = await orm.public.StaffProfile.where({
        id: event.staffId,
        organizationId: event.organizationId,
      }).first()

      const departmentHeadId = staff?.departmentId
        ? await departmentHeadUserId(
            orm,
            event.organizationId,
            String(staff.departmentId),
          )
        : null

      const hrIds = await activeMembersWithRoleNames(
        orm,
        event.organizationId,
        LEAVE_REVIEWER_ROLE_NAMES,
      )

      return uniqueIds([departmentHeadId, ...hrIds])
    }
    case "LEAVE_APPROVED":
    case "LEAVE_REJECTED":
    case "LEAVE_CANCELLED":
      return uniqueIds([
        await linkedUserIdForStaff(orm, event.organizationId, event.staffId),
      ])
    case "SHIFT_SWAP_REQUESTED":
    case "SHIFT_SWAP_CANCELLED":
      return uniqueIds([
        await linkedUserIdForStaff(orm, event.organizationId, event.targetStaffId),
      ])
    case "SHIFT_SWAP_REJECTED":
      return uniqueIds([
        await linkedUserIdForStaff(orm, event.organizationId, event.requesterStaffId),
      ])
    case "SHIFT_SWAP_COMPLETED": {
      const [requesterUserId, targetUserId] = await Promise.all([
        linkedUserIdForStaff(orm, event.organizationId, event.requesterStaffId),
        linkedUserIdForStaff(orm, event.organizationId, event.targetStaffId),
      ])
      return uniqueIds([requesterUserId, targetUserId])
    }
    case "ROSTER_SUBMITTED_FOR_REVIEW":
    case "ROSTER_AMENDMENT_CREATED": {
      const [departmentHeadId, managerIds] = await Promise.all([
        departmentHeadUserId(orm, event.organizationId, event.departmentId),
        activeMembersWithRoleNames(
          orm,
          event.organizationId,
          ROSTER_REVIEWER_ROLE_NAMES,
        ),
      ])
      return uniqueIds([departmentHeadId, ...managerIds])
    }
    case "ROSTER_RETURNED_TO_DRAFT":
      return uniqueIds([
        await activeMemberUserId(orm, event.organizationId, event.createdByUserId),
      ])
    case "ROSTER_PUBLISHED": {
      const assignments = await orm.public.ShiftAssignment.where({
        organizationId: event.organizationId,
        rosterId: event.rosterId,
      }).all()

      const staffIds = uniqueIds(assignments.map((assignment) => String(assignment.staffId)))
      const userIds = await Promise.all(
        staffIds.map((staffId) =>
          linkedUserIdForStaff(orm, event.organizationId, staffId),
        ),
      )
      return uniqueIds(userIds)
    }
    case "ATTENDANCE_CORRECTED":
    case "ATTENDANCE_APPROVED":
    case "ATTENDANCE_REJECTED":
      return uniqueIds([
        await linkedUserIdForStaff(orm, event.organizationId, event.staffId),
      ])
  }
}

export async function resolveNotificationIntents(
  orm: PublicOrm,
  event: DomainNotificationEvent,
): Promise<NotificationIntent[]> {
  const copy = notificationCopy(event)
  const entityType = entityTypeForNotification(event.type)
  const recipients = await resolveRecipientUserIds(orm, event)

  return recipients
    .filter((recipientUserId) => recipientUserId !== event.actorUserId)
    .map((recipientUserId) => ({
      organizationId: event.organizationId,
      eventId: event.eventId,
      type: event.type,
      recipientUserId,
      ...(entityType ? { entityType, entityId: event.eventId } : {}),
      title: copy.title,
      body: copy.body,
    }))
}
