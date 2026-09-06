import type { Temporal } from "temporal-polyfill"

import type { SchedulingConfig } from "@/modules/scheduling/types/scheduling-config"
import type { SchedulingLeavePeriod } from "@/modules/scheduling/types/leave"

export type SchedulingQualification = {
  typeId: string
  expiresAt?: string
}

export type SchedulingStaff = {
  id: string
  organizationId: string
  professionId: string
  qualifications?: SchedulingQualification[]
}

export type SchedulingAssignment = {
  id?: string
  organizationId: string
  rosterId: string
  staffId: string
  shiftTypeId: string
  professionId: string
  date: string
  isOvernight: boolean
  startDateTime: Temporal.Instant
  endDateTime: Temporal.Instant
  requiredQualificationTypeIds?: string[]
}

export type SchedulingRoster = {
  id: string
  departmentId: string
  startDate: string
  endDate: string
}

export type SchedulingRequirement = {
  shiftTypeId: string
  professionId: string
  requiredCount: number
}

export type SchedulingFocus = {
  staffId: string
  date: string
  shiftTypeId: string
  professionId: string
  assignmentId?: string
}

export type SchedulingContext = {
  organizationId: string
  timeZone: string
  roster: SchedulingRoster
  staff: SchedulingStaff[]
  assignments: SchedulingAssignment[]
  requirements: SchedulingRequirement[]
  leavePeriods: SchedulingLeavePeriod[]
  config: SchedulingConfig
  focus?: SchedulingFocus
}
