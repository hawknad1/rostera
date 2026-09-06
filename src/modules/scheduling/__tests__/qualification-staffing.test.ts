import { describe, expect, it } from "vitest"

import { detectConflicts } from "@/modules/scheduling/engine/detectConflicts"
import { validateAssignment } from "@/modules/scheduling/engine/validateAssignment"
import { makeAssignment, makeContext, makeStaff } from "@/modules/scheduling/__tests__/helpers"

describe("qualification rule", () => {
  it("allows a matching profession", () => {
    const candidate = makeAssignment({
      date: "2026-09-03",
      professionId: "prof-nurse",
    })

    const result = validateAssignment(makeContext(), candidate)

    expect(result.conflicts.filter((conflict) => conflict.code === "QUALIFICATION_MISMATCH")).toEqual(
      [],
    )
  })

  it("flags a profession mismatch", () => {
    const candidate = makeAssignment({
      date: "2026-09-03",
      professionId: "prof-pharmacist",
    })

    const result = validateAssignment(
      makeContext({
        staff: [makeStaff({ professionId: "prof-nurse" })],
      }),
      candidate,
    )

    expect(result.valid).toBe(false)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "QUALIFICATION_MISMATCH",
          severity: "CRITICAL",
          blocking: true,
        }),
      ]),
    )
  })
})

describe("staffing requirement rule", () => {
  const requirements = [
    {
      shiftTypeId: "shift-day",
      professionId: "prof-nurse",
      requiredCount: 3,
    },
  ]

  it("warns when required 3 and assigned 2", () => {
    const result = detectConflicts(
      makeContext({
        roster: {
          id: "roster-a",
          departmentId: "dept-a",
          startDate: "2026-09-03",
          endDate: "2026-09-03",
        },
        requirements,
        assignments: [
          makeAssignment({ id: "a1", date: "2026-09-03", staffId: "staff-ama" }),
          makeAssignment({ id: "a2", date: "2026-09-03", staffId: "staff-kofi" }),
        ],
        staff: [makeStaff(), makeStaff({ id: "staff-kofi" })],
      }),
    )

    expect(result.valid).toBe(true)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "STAFFING_SHORTFALL",
          severity: "WARNING",
          blocking: false,
          metadata: expect.objectContaining({ shortfall: 1 }),
        }),
      ]),
    )
  })

  it("emits no staffing conflict when required 3 and assigned 3", () => {
    const result = detectConflicts(
      makeContext({
        roster: {
          id: "roster-a",
          departmentId: "dept-a",
          startDate: "2026-09-03",
          endDate: "2026-09-03",
        },
        requirements,
        assignments: [
          makeAssignment({ id: "a1", date: "2026-09-03", staffId: "staff-ama" }),
          makeAssignment({ id: "a2", date: "2026-09-03", staffId: "staff-kofi" }),
          makeAssignment({ id: "a3", date: "2026-09-03", staffId: "staff-yaw" }),
        ],
        staff: [
          makeStaff(),
          makeStaff({ id: "staff-kofi" }),
          makeStaff({ id: "staff-yaw" }),
        ],
      }),
    )

    expect(result.conflicts.filter((conflict) => conflict.code.startsWith("STAFFING_"))).toEqual([])
  })

  it("emits informational overstaffing when required 3 and assigned 4", () => {
    const result = detectConflicts(
      makeContext({
        roster: {
          id: "roster-a",
          departmentId: "dept-a",
          startDate: "2026-09-03",
          endDate: "2026-09-03",
        },
        requirements,
        assignments: [
          makeAssignment({ id: "a1", date: "2026-09-03", staffId: "staff-ama" }),
          makeAssignment({ id: "a2", date: "2026-09-03", staffId: "staff-kofi" }),
          makeAssignment({ id: "a3", date: "2026-09-03", staffId: "staff-yaw" }),
          makeAssignment({ id: "a4", date: "2026-09-03", staffId: "staff-efua" }),
        ],
        staff: [
          makeStaff(),
          makeStaff({ id: "staff-kofi" }),
          makeStaff({ id: "staff-yaw" }),
          makeStaff({ id: "staff-efua" }),
        ],
      }),
    )

    expect(result.valid).toBe(true)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "STAFFING_OVERSTAFFED",
          severity: "INFO",
          blocking: false,
        }),
      ]),
    )
  })
})
