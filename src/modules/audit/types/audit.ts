export const auditActions = [
  "ROSTER_CREATED",
  "ROSTER_UPDATED",
  "ROSTER_SUBMITTED_FOR_REVIEW",
  "ROSTER_RETURNED_TO_DRAFT",
  "ROSTER_PUBLISHED",
  "ROSTER_DELETED",
  "ASSIGNMENT_CREATED",
  "ASSIGNMENT_DELETED",
  "LEAVE_CREATED",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "LEAVE_CANCELLED",
  "SHIFT_SWAP_REQUESTED",
  "SHIFT_SWAP_COMPLETED",
  "SHIFT_SWAP_REJECTED",
  "SHIFT_SWAP_CANCELLED",
  "STAFF_CREATED",
  "STAFF_UPDATED",
  "STAFF_DEACTIVATED",
  "DEPARTMENT_CREATED",
  "DEPARTMENT_UPDATED",
  "DEPARTMENT_DELETED",
  "DEPARTMENT_HEAD_ASSIGNED",
  "DEPARTMENT_HEAD_REMOVED",
  "PROFESSION_CREATED",
  "PROFESSION_UPDATED",
  "PROFESSION_DEACTIVATED",
  "SHIFT_TYPE_CREATED",
  "SHIFT_TYPE_UPDATED",
  "SHIFT_TYPE_DEACTIVATED",
  "STAFFING_REQUIREMENT_CREATED",
  "STAFFING_REQUIREMENT_UPDATED",
  "STAFFING_REQUIREMENT_DELETED",
  "SCHEDULING_POLICY_UPDATED",
  "USER_INVITED",
  "USER_UPDATED",
  "USER_DEACTIVATED",
  "MEMBERSHIP_ROLE_CHANGED",
  "MEMBERSHIP_ACTIVATED",
  "MEMBERSHIP_DEACTIVATED",
] as const

export type AuditAction = (typeof auditActions)[number]

export const auditEntityTypes = [
  "ROSTER",
  "ASSIGNMENT",
  "LEAVE_REQUEST",
  "SHIFT_SWAP",
  "STAFF",
  "DEPARTMENT",
  "PROFESSION",
  "SHIFT_TYPE",
  "STAFFING_REQUIREMENT",
  "SCHEDULING_POLICY",
  "USER",
  "MEMBERSHIP",
] as const

export type AuditEntityType = (typeof auditEntityTypes)[number]

export const auditActorTypes = ["USER", "SYSTEM"] as const

export type AuditActorType = (typeof auditActorTypes)[number]

export type AuditActor =
  | {
      type: "USER"
      userId: string
      organizationId: string
      membershipId?: string
    }
  | {
      type: "SYSTEM"
      organizationId: string
    }

export type AuditWriteInput = {
  actor: AuditActor
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  summary: string
  metadata?: unknown
  eventId?: string
  requestId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export const AUDIT_PAGE_SIZE = 25

export const auditActionLabels: Record<AuditAction, string> = {
  ROSTER_CREATED: "Created roster",
  ROSTER_UPDATED: "Updated roster",
  ROSTER_SUBMITTED_FOR_REVIEW: "Submitted roster for review",
  ROSTER_RETURNED_TO_DRAFT: "Returned roster to draft",
  ROSTER_PUBLISHED: "Published roster",
  ROSTER_DELETED: "Deleted roster",
  ASSIGNMENT_CREATED: "Created assignment",
  ASSIGNMENT_DELETED: "Deleted assignment",
  LEAVE_CREATED: "Created leave request",
  LEAVE_APPROVED: "Approved leave",
  LEAVE_REJECTED: "Rejected leave",
  LEAVE_CANCELLED: "Cancelled leave",
  SHIFT_SWAP_REQUESTED: "Requested shift swap",
  SHIFT_SWAP_COMPLETED: "Completed shift swap",
  SHIFT_SWAP_REJECTED: "Rejected shift swap",
  SHIFT_SWAP_CANCELLED: "Cancelled shift swap",
  STAFF_CREATED: "Created staff member",
  STAFF_UPDATED: "Updated staff member",
  STAFF_DEACTIVATED: "Deactivated staff member",
  DEPARTMENT_CREATED: "Created department",
  DEPARTMENT_UPDATED: "Updated department",
  DEPARTMENT_DELETED: "Deleted department",
  DEPARTMENT_HEAD_ASSIGNED: "Assigned department head",
  DEPARTMENT_HEAD_REMOVED: "Removed department head",
  PROFESSION_CREATED: "Created profession",
  PROFESSION_UPDATED: "Updated profession",
  PROFESSION_DEACTIVATED: "Deactivated profession",
  SHIFT_TYPE_CREATED: "Created shift type",
  SHIFT_TYPE_UPDATED: "Updated shift type",
  SHIFT_TYPE_DEACTIVATED: "Deactivated shift type",
  STAFFING_REQUIREMENT_CREATED: "Created staffing requirement",
  STAFFING_REQUIREMENT_UPDATED: "Updated staffing requirement",
  STAFFING_REQUIREMENT_DELETED: "Deleted staffing requirement",
  SCHEDULING_POLICY_UPDATED: "Updated scheduling policy",
  USER_INVITED: "Invited user",
  USER_UPDATED: "Updated user",
  USER_DEACTIVATED: "Deactivated user",
  MEMBERSHIP_ROLE_CHANGED: "Changed membership role",
  MEMBERSHIP_ACTIVATED: "Activated membership",
  MEMBERSHIP_DEACTIVATED: "Deactivated membership",
}

export const auditEntityLabels: Record<AuditEntityType, string> = {
  ROSTER: "Roster",
  ASSIGNMENT: "Assignment",
  LEAVE_REQUEST: "Leave request",
  SHIFT_SWAP: "Shift swap",
  STAFF: "Staff",
  DEPARTMENT: "Department",
  PROFESSION: "Profession",
  SHIFT_TYPE: "Shift type",
  STAFFING_REQUIREMENT: "Staffing requirement",
  SCHEDULING_POLICY: "Scheduling policy",
  USER: "User",
  MEMBERSHIP: "Membership",
}
