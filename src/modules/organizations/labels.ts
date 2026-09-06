export const organizationTypeLabels = {
  HOSPITAL: "Hospital",
  CLINIC: "Clinic",
  HEALTH_SYSTEM: "Health system",
  OTHER: "Other",
} as const

export const membershipStatusLabels = {
  INVITED: "Invited",
  ACTIVE: "Active",
  SUSPENDED: "Deactivated",
  REMOVED: "Removed",
} as const

export const invitationStatusLabels = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
} as const

export const organizationStatusLabels = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
} as const

export const COMMON_TIMEZONES = [
  "Africa/Accra",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
] as const

export const PERMISSION_GROUPS = [
  { id: "organization", label: "Organization", prefixes: ["organization."] },
  { id: "users", label: "Users", prefixes: ["users."] },
  { id: "roles", label: "Roles", prefixes: ["roles."] },
  { id: "staff", label: "Staff", prefixes: ["staff."] },
  { id: "roster", label: "Roster", prefixes: ["roster."] },
  { id: "shifts", label: "Shifts", prefixes: ["shift.", "shift_swap."] },
  { id: "departments", label: "Departments", prefixes: ["department."] },
  { id: "leave", label: "Leave", prefixes: ["leave."] },
  { id: "attendance", label: "Attendance", prefixes: ["attendance."] },
  { id: "reports", label: "Reports", prefixes: ["reports."] },
  { id: "notifications", label: "Notifications", prefixes: ["notifications."] },
  { id: "settings", label: "Settings", prefixes: ["settings."] },
  { id: "audit", label: "Audit", prefixes: ["audit."] },
] as const
