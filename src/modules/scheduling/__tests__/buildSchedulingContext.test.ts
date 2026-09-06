import { Temporal } from "temporal-polyfill"
import { describe, expect, it } from "vitest"

import { buildSchedulingContext } from "@/modules/scheduling/engine/buildSchedulingContext"

describe("buildSchedulingContext", () => {
  it("drops assignments and staff from other organizations", () => {
    const context = buildSchedulingContext({
      organizationId: "org-a",
      timeZone: "Africa/Accra",
      roster: {
        id: "roster-a",
        departmentId: "dept-a",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      },
      staff: [
        { id: "staff-ama", organizationId: "org-a", professionId: "prof-nurse" },
        { id: "staff-efua", organizationId: "org-b", professionId: "prof-nurse" },
      ],
      assignments: [
        {
          id: "a1",
          organizationId: "org-a",
          rosterId: "roster-a",
          staffId: "staff-ama",
          shiftTypeId: "shift-day",
          professionId: "prof-nurse",
          date: "2026-09-03",
          isOvernight: false,
          startDateTime: Temporal.Instant.from("2026-09-03T08:00:00Z"),
          endDateTime: Temporal.Instant.from("2026-09-03T16:00:00Z"),
        },
        {
          id: "a2",
          organizationId: "org-b",
          rosterId: "roster-b",
          staffId: "staff-efua",
          shiftTypeId: "shift-day",
          professionId: "prof-nurse",
          date: "2026-09-03",
          isOvernight: false,
          startDateTime: Temporal.Instant.from("2026-09-03T08:00:00Z"),
          endDateTime: Temporal.Instant.from("2026-09-03T16:00:00Z"),
        },
      ],
      requirements: [],
    })

    expect(context.staff.map((member) => member.id)).toEqual(["staff-ama"])
    expect(context.assignments.map((assignment) => assignment.id)).toEqual(["a1"])
  })
})
