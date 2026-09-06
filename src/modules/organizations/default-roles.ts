import { permissions, type Permission } from "@/lib/permissions/permissions"

export const DEFAULT_ROLE_NAMES = [
  "SUPER_ADMIN",
  "ROSTER_MANAGER",
  "DEPARTMENT_HEAD",
  "SUPERVISOR",
  "HR",
  "STAFF",
] as const

export type DefaultRoleName = (typeof DEFAULT_ROLE_NAMES)[number]

export const ALL_PERMISSIONS = Object.values(permissions) as Permission[]

export const DEFAULT_ROLE_PERMISSIONS: Record<DefaultRoleName, readonly Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  ROSTER_MANAGER: [
    permissions.rosterView,
    permissions.rosterCreate,
    permissions.rosterEdit,
    permissions.rosterReview,
    permissions.rosterPublish,
    permissions.rosterAmend,
    permissions.staffView,
    permissions.shiftView,
    permissions.shiftCreate,
    permissions.shiftEdit,
    permissions.shiftDeactivate,
    permissions.departmentView,
    permissions.leaveView,
    permissions.shiftSwapView,
    permissions.reportsView,
    permissions.reportsExport,
    permissions.settingsView,
  ],

  DEPARTMENT_HEAD: [
    permissions.rosterView,
    permissions.rosterCreate,
    permissions.rosterEdit,
    permissions.rosterReview,
    permissions.staffView,
    permissions.shiftView,
    permissions.departmentView,
    permissions.departmentEdit,
    permissions.leaveView,
    permissions.leaveCreate,
    permissions.leaveApprove,
    permissions.leaveReject,
    permissions.shiftSwapView,
    permissions.shiftSwapApprove,
    permissions.shiftSwapReject,
    permissions.reportsView,
  ],

  SUPERVISOR: [
    permissions.rosterView,
    permissions.staffView,
    permissions.shiftView,
    permissions.departmentView,
    permissions.leaveView,
    permissions.shiftSwapView,
    permissions.reportsView,
  ],

  HR: [
    permissions.staffView,
    permissions.staffCreate,
    permissions.staffEdit,
    permissions.staffDeactivate,
    permissions.departmentView,
    permissions.leaveView,
    permissions.leaveCreate,
    permissions.leaveApprove,
    permissions.leaveReject,
    permissions.shiftSwapView,
    permissions.reportsView,
    permissions.reportsExport,
    permissions.usersView,
    permissions.usersInvite,
    permissions.usersEdit,
    permissions.usersDeactivate,
  ],

  STAFF: [
    permissions.rosterView,
    permissions.staffView,
    permissions.leaveView,
    permissions.leaveCreate,
    permissions.shiftSwapView,
    permissions.shiftSwapRequest,
  ],
}
