export const permissions = {
  rosterView: "roster.view",
  rosterCreate: "roster.create",
  rosterEdit: "roster.edit",
  rosterReview: "roster.review",
  rosterPublish: "roster.publish",
  rosterAmend: "roster.amend",

  staffView: "staff.view",
  staffCreate: "staff.create",
  staffEdit: "staff.edit",
  staffDeactivate: "staff.deactivate",

  shiftView: "shift.view",
  shiftCreate: "shift.create",
  shiftEdit: "shift.edit",
  shiftDeactivate: "shift.deactivate",

  departmentView: "department.view",
  departmentCreate: "department.create",
  departmentEdit: "department.edit",
  departmentDelete: "department.delete",

  leaveView: "leave.view",
  leaveCreate: "leave.create",
  leaveApprove: "leave.approve",
  leaveReject: "leave.reject",

  shiftSwapView: "shift_swap.view",
  shiftSwapRequest: "shift_swap.request",
  shiftSwapApprove: "shift_swap.approve",
  shiftSwapReject: "shift_swap.reject",

  reportsView: "reports.view",
  reportsExport: "reports.export",

  usersView: "users.view",
  usersInvite: "users.invite",
  usersEdit: "users.edit",
  usersDeactivate: "users.deactivate",

  settingsView: "settings.view",
  settingsEdit: "settings.edit",

  auditView: "audit.view",

  notificationsView: "notifications.view",

  attendanceView: "attendance.view",
  attendanceClockIn: "attendance.clock_in",
  attendanceClockOut: "attendance.clock_out",
  attendanceCorrect: "attendance.correct",
  attendanceApprove: "attendance.approve",
  attendanceExport: "attendance.export",
} as const

export type Permission = (typeof permissions)[keyof typeof permissions]
