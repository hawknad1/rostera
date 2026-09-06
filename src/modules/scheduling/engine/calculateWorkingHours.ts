import { isDateInInclusiveRange } from "@/lib/dates/calendar-date"
import { instantDurationMinutes } from "@/lib/dates/workingHours"
import type { SchedulingAssignment } from "@/modules/scheduling/types/scheduling-context"

export function calculateWorkingHours(input: {
  assignments: Pick<SchedulingAssignment, "staffId" | "date" | "startDateTime" | "endDateTime">[]
  staffId?: string
  startDate?: string
  endDate?: string
}) {
  let minutes = 0

  for (const assignment of input.assignments) {
    if (input.staffId && assignment.staffId !== input.staffId) {
      continue
    }

    if (input.startDate && input.endDate) {
      if (!isDateInInclusiveRange(assignment.date, input.startDate, input.endDate)) {
        continue
      }
    }

    minutes += instantDurationMinutes(assignment.startDateTime, assignment.endDateTime)
  }

  return minutes
}
