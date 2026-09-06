import type { CurrentMembership } from "@/lib/auth/get-current-membership"
import type { CurrentUser } from "@/lib/auth/get-current-user"
import type { LeaveType } from "@/modules/leave/schemas/leave"
import type { LeaveStatus } from "@/modules/scheduling/types/leave"
import type { SwapStatus } from "@/modules/shift-swaps/labels"

export type StaffEmploymentStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED"

export type LinkedStaffProfile = {
  id: string
  organizationId: string
  userId: string
  firstName: string
  middleName: string | null
  lastName: string
  staffNumber: string
  departmentId: string
  departmentName: string
  employmentStatus: StaffEmploymentStatus
}

export type StaffIdentityLinked = {
  status: "LINKED"
  membership: CurrentMembership
  user: CurrentUser
  staff: LinkedStaffProfile
  timeZone: string
  organizationName: string
  canMutate: boolean
}

export type StaffIdentityUnlinked = {
  status: "UNLINKED"
  membership: CurrentMembership
  user: CurrentUser
  timeZone: string
  organizationName: string
}

export type StaffIdentity = StaffIdentityLinked | StaffIdentityUnlinked

export type StaffShiftView = {
  id: string
  date: string
  dateLabel: string
  weekdayLabel: string
  relativeDayLabel: string
  shiftTypeName: string
  startTime: string
  endTime: string
  timeLabel: string
  isOvernight: boolean
  departmentId: string
  departmentName: string
  rosterId: string
  rosterName: string
  rosterVersion: number
  rosterStatus: "PUBLISHED"
  seriesId: string
  startDateTime: string
  endDateTime: string
}

export type StaffRosterView = {
  id: string
  name: string
  departmentId: string
  departmentName: string
  startDate: string
  endDate: string
  dateRangeLabel: string
  versionNumber: number
  seriesId: string
  status: "PUBLISHED"
}

export type StaffShiftDetail = StaffShiftView & {
  isCurrent: boolean
  swapEligible: boolean
  swapEligibilityNote: string
}

export type StaffLeaveSummary = {
  id: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  status: LeaveStatus
  createdAt: unknown
}

export type StaffSwapSummary = {
  id: string
  status: SwapStatus
  sourceDate: string
  sourceShiftName: string
  targetShiftName: string
  isRequester: boolean
}

export type StaffNotificationSummary = {
  id: string
  title: string
  body: string
  entityType: string | null
  entityId: string | null
  readAt: unknown
  createdAt: unknown
}

export type StaffHomeView = {
  identity: StaffIdentityLinked
  greeting: string
  firstName: string
  organizationName: string
  currentRoster: StaffRosterView | null
  currentShift: StaffShiftView | null
  nextShift: StaffShiftView | null
  upcoming: StaffShiftView[]
  pendingLeaveCount: number
  pendingSwapCount: number
  unreadNotificationCount: number
}

export type StaffOfflineCache = {
  version: 1
  userId: string
  organizationId: string
  cachedAt: string
  home: StaffHomeCache | null
  roster: {
    rosters: StaffRosterView[]
    assignments: StaffShiftView[]
  } | null
  shifts: StaffShiftView[]
  shiftDetails: Record<string, StaffShiftDetail>
  notifications: {
    unreadCount: number
    items: StaffNotificationSummary[]
  } | null
}

export type StaffHomeCache = {
  greeting: string
  firstName: string
  organizationName: string
  currentRoster: StaffRosterView | null
  currentShift: StaffShiftView | null
  nextShift: StaffShiftView | null
  upcoming: StaffShiftView[]
  pendingLeaveCount: number
  pendingSwapCount: number
  unreadNotificationCount: number
}
