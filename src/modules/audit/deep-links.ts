import type { AuditEntityType } from "@/modules/audit/types/audit"

export function auditEntityHref(entityType: AuditEntityType, entityId: string) {
  switch (entityType) {
    case "ROSTER":
      return `/rosters/${entityId}`
    case "LEAVE_REQUEST":
      return `/leave/${entityId}`
    case "SHIFT_SWAP":
      return `/shift-swaps/${entityId}`
    case "STAFF":
      return `/staff/${entityId}`
    case "DEPARTMENT":
      return `/departments/${entityId}`
    case "SHIFT_TYPE":
      return `/shifts/${entityId}`
    case "STAFFING_REQUIREMENT":
      return `/shifts/requirements`
    case "SCHEDULING_POLICY":
      return `/settings/scheduling`
    case "ATTENDANCE":
      return `/attendance/${entityId}`
    case "ATTENDANCE_POLICY":
      return `/settings/attendance`
    case "PROFESSION":
      return `/professions`
    case "ORGANIZATION":
      return `/settings/organization`
    case "INVITATION":
      return `/settings/invitations`
    case "ROLE":
      return `/settings/roles/${entityId}`
    default:
      return null
  }
}
