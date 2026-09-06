import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"

export const AUTH_STAFF = "supabase-auth-staff"
export const AUTH_STAFF_B = "supabase-auth-staff-b"
export const AUTH_UNLINKED = "supabase-auth-unlinked"
export const AUTH_TERMINATED = "supabase-auth-terminated"
export const AUTH_ADMIN = "supabase-auth-admin"
export const AUTH_B = "supabase-auth-org-b"

export const USER_STAFF = "user-staff"
export const USER_STAFF_B = "user-staff-b"
export const USER_UNLINKED = "user-unlinked"
export const USER_TERMINATED = "user-terminated"
export const USER_ADMIN = "user-admin"
export const USER_B = "user-b"

export const ORG_A = "org-a"
export const ORG_B = "org-b"

const PERMISSION_IDS = {
  rosterView: "perm-roster-view",
  rosterCreate: "perm-roster-create",
  rosterEdit: "perm-roster-edit",
  leaveView: "perm-leave-view",
  leaveCreate: "perm-leave-create",
  leaveApprove: "perm-leave-approve",
  shiftSwapView: "perm-swap-view",
  shiftSwapRequest: "perm-swap-request",
} as const

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

export function seedStaffApp() {
  memory.insert("Permission", { id: PERMISSION_IDS.rosterView, key: permissions.rosterView })
  memory.insert("Permission", { id: PERMISSION_IDS.rosterCreate, key: permissions.rosterCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.rosterEdit, key: permissions.rosterEdit })
  memory.insert("Permission", { id: PERMISSION_IDS.leaveView, key: permissions.leaveView })
  memory.insert("Permission", { id: PERMISSION_IDS.leaveCreate, key: permissions.leaveCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.leaveApprove, key: permissions.leaveApprove })
  memory.insert("Permission", { id: PERMISSION_IDS.shiftSwapView, key: permissions.shiftSwapView })
  memory.insert("Permission", { id: PERMISSION_IDS.shiftSwapRequest, key: permissions.shiftSwapRequest })

  memory.insert("Organization", {
    id: ORG_A,
    name: "Hospital A",
    slug: "hospital-a",
    timezone: "Africa/Accra",
  })
  memory.insert("Organization", {
    id: ORG_B,
    name: "Hospital B",
    slug: "hospital-b",
    timezone: "Africa/Johannesburg",
  })

  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "ama@test.local" })
  memory.insert("User", { id: USER_STAFF_B, authProviderId: AUTH_STAFF_B, email: "kofi@test.local" })
  memory.insert("User", { id: USER_UNLINKED, authProviderId: AUTH_UNLINKED, email: "unlinked@test.local" })
  memory.insert("User", {
    id: USER_TERMINATED,
    authProviderId: AUTH_TERMINATED,
    email: "term@test.local",
  })
  memory.insert("User", { id: USER_ADMIN, authProviderId: AUTH_ADMIN, email: "admin@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })

  memory.insert("Role", { id: "role-staff", organizationId: ORG_A, name: "STAFF" })
  memory.insert("Role", { id: "role-admin", organizationId: ORG_A, name: "SUPER_ADMIN" })
  memory.insert("Role", { id: "role-b", organizationId: ORG_B, name: "STAFF" })

  grant("role-staff", PERMISSION_IDS.rosterView)
  grant("role-staff", PERMISSION_IDS.leaveView)
  grant("role-staff", PERMISSION_IDS.leaveCreate)
  grant("role-staff", PERMISSION_IDS.shiftSwapView)
  grant("role-staff", PERMISSION_IDS.shiftSwapRequest)
  grant("role-admin", PERMISSION_IDS.rosterView)
  grant("role-admin", PERMISSION_IDS.rosterCreate)
  grant("role-admin", PERMISSION_IDS.rosterEdit)
  grant("role-admin", PERMISSION_IDS.leaveView)
  grant("role-admin", PERMISSION_IDS.leaveCreate)
  grant("role-admin", PERMISSION_IDS.leaveApprove)
  grant("role-b", PERMISSION_IDS.rosterView)
  grant("role-b", PERMISSION_IDS.leaveView)
  grant("role-b", PERMISSION_IDS.leaveCreate)
  grant("role-b", PERMISSION_IDS.shiftSwapView)
  grant("role-b", PERMISSION_IDS.shiftSwapRequest)

  memory.insert("OrganizationMember", {
    id: "membership-staff",
    organizationId: ORG_A,
    userId: USER_STAFF,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-staff-b",
    organizationId: ORG_A,
    userId: USER_STAFF_B,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-unlinked",
    organizationId: ORG_A,
    userId: USER_UNLINKED,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-terminated",
    organizationId: ORG_A,
    userId: USER_TERMINATED,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-admin",
    organizationId: ORG_A,
    userId: USER_ADMIN,
    roleId: "role-admin",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-b",
    organizationId: ORG_B,
    userId: USER_B,
    roleId: "role-b",
    status: "ACTIVE",
  })

  memory.insert("Profession", {
    id: "prof-nurse",
    organizationId: null,
    name: "Nurse",
    isActive: true,
  })
  memory.insert("Department", { id: "dept-a", organizationId: ORG_A, name: "Emergency" })
  memory.insert("Department", { id: "dept-b", organizationId: ORG_B, name: "Emergency" })

  memory.insert("ShiftType", {
    id: "shift-day",
    organizationId: ORG_A,
    name: "Day Duty",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-night",
    organizationId: ORG_A,
    name: "Night Duty",
    startTime: "22:00",
    endTime: "06:00",
    isOvernight: true,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-day-b",
    organizationId: ORG_B,
    name: "Day Duty",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })

  memory.insert("StaffProfile", {
    id: "staff-ama",
    organizationId: ORG_A,
    userId: USER_STAFF,
    staffNumber: "NUR-001",
    firstName: "Ama",
    lastName: "Mensah",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-kofi",
    organizationId: ORG_A,
    userId: USER_STAFF_B,
    staffNumber: "NUR-002",
    firstName: "Kofi",
    lastName: "Owusu",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-terminated",
    organizationId: ORG_A,
    userId: USER_TERMINATED,
    staffNumber: "NUR-003",
    firstName: "Yaw",
    lastName: "Asante",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "TERMINATED",
  })
  memory.insert("StaffProfile", {
    id: "staff-b",
    organizationId: ORG_B,
    userId: USER_B,
    staffNumber: "NUR-001",
    firstName: "Abena",
    lastName: "Sarpong",
    professionId: "prof-nurse",
    departmentId: "dept-b",
    employmentStatus: "ACTIVE",
  })
  memory.insert("OrganizationSchedulingPolicy", {
    id: "policy-a",
    organizationId: ORG_A,
  })
  memory.insert("OrganizationSchedulingPolicy", {
    id: "policy-b",
    organizationId: ORG_B,
  })
}

export function insertPublishedRoster(overrides?: {
  id?: string
  seriesId?: string
  versionNumber?: number
  status?: string
  organizationId?: string
  departmentId?: string
}) {
  const id = overrides?.id ?? "roster-v1"
  memory.insert("Roster", {
    id,
    organizationId: overrides?.organizationId ?? ORG_A,
    departmentId: overrides?.departmentId ?? "dept-a",
    name: "September Emergency",
    startDate: "2026-09-07",
    endDate: "2026-09-20",
    status: overrides?.status ?? "PUBLISHED",
    seriesId: overrides?.seriesId ?? "series-ed",
    versionNumber: overrides?.versionNumber ?? 1,
    createdByUserId: USER_ADMIN,
  })
  return id
}

export function insertAssignment(input: {
  id: string
  staffId: string
  rosterId: string
  date: string
  shiftTypeId?: string
  organizationId?: string
  departmentId?: string
  overnight?: boolean
}) {
  const overnight = input.overnight ?? false
  memory.insert("ShiftAssignment", {
    id: input.id,
    organizationId: input.organizationId ?? ORG_A,
    rosterId: input.rosterId,
    departmentId: input.departmentId ?? "dept-a",
    staffId: input.staffId,
    shiftTypeId: input.shiftTypeId ?? (overnight ? "shift-night" : "shift-day"),
    professionId: "prof-nurse",
    date: input.date,
    shiftStartTime: overnight ? "22:00" : "08:00",
    shiftEndTime: overnight ? "06:00" : "16:00",
    isOvernight: overnight,
    startDateTime: overnight ? `${input.date}T22:00:00.000Z` : `${input.date}T08:00:00.000Z`,
    endDateTime: overnight
      ? `${input.date.slice(0, 8)}${String(Number(input.date.slice(8, 10)) + 1).padStart(2, "0")}T06:00:00.000Z`
      : `${input.date}T16:00:00.000Z`,
  })
}
