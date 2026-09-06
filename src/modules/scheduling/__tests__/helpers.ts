import { assignmentDateTimeWindow } from "@/lib/dates/assignment-window"
import type { SchedulingConfig } from "@/modules/scheduling/types/scheduling-config"
import type {
  SchedulingAssignment,
  SchedulingContext,
  SchedulingStaff,
} from "@/modules/scheduling/types/scheduling-context"

export const TIME_ZONE = "Africa/Accra"

export function shiftWindow(
  date: string,
  startTime: string,
  endTime: string,
  isOvernight: boolean,
) {
  return assignmentDateTimeWindow({
    date,
    startTime,
    endTime,
    isOvernight,
    timeZone: TIME_ZONE,
  })
}

export function makeStaff(overrides: Partial<SchedulingStaff> = {}): SchedulingStaff {
  return {
    id: "staff-ama",
    organizationId: "org-a",
    professionId: "prof-nurse",
    ...overrides,
  }
}

export function makeAssignment(input: {
  id?: string
  date: string
  startTime?: string
  endTime?: string
  isOvernight?: boolean
  staffId?: string
  shiftTypeId?: string
  professionId?: string
  rosterId?: string
  organizationId?: string
}): SchedulingAssignment {
  const startTime = input.startTime ?? "08:00"
  const endTime = input.endTime ?? "16:00"
  const isOvernight = input.isOvernight ?? false
  const window = shiftWindow(input.date, startTime, endTime, isOvernight)

  return {
    id: input.id,
    organizationId: input.organizationId ?? "org-a",
    rosterId: input.rosterId ?? "roster-a",
    staffId: input.staffId ?? "staff-ama",
    shiftTypeId: input.shiftTypeId ?? "shift-day",
    professionId: input.professionId ?? "prof-nurse",
    date: input.date,
    isOvernight,
    startDateTime: window.start,
    endDateTime: window.end,
  }
}

export function makeContext(
  overrides: Partial<SchedulingContext> & { config?: SchedulingConfig } = {},
): SchedulingContext {
  return {
    organizationId: "org-a",
    timeZone: TIME_ZONE,
    roster: {
      id: "roster-a",
      departmentId: "dept-a",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    },
    staff: [makeStaff()],
    assignments: [],
    requirements: [],
    leavePeriods: [],
    config: {},
    ...overrides,
  }
}
