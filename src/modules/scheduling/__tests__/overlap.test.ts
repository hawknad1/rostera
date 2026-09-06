import { describe, expect, it } from "vitest"

import { validateAssignment } from "@/modules/scheduling/engine/validateAssignment"
import { overlapRule } from "@/modules/scheduling/rules/overlap"
import { makeAssignment, makeContext } from "@/modules/scheduling/__tests__/helpers"

describe("overlap rule", () => {
  it("flags overlapping daytime assignments", () => {
    const existing = makeAssignment({
      id: "a1",
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
    })
    const candidate = makeAssignment({
      date: "2026-09-03",
      startTime: "14:00",
      endTime: "22:00",
      shiftTypeId: "shift-late",
    })

    const result = validateAssignment(makeContext({ assignments: [existing] }), candidate)

    expect(result.valid).toBe(false)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ASSIGNMENT_OVERLAP",
          severity: "ERROR",
          blocking: true,
          relatedAssignmentId: "a1",
        }),
      ]),
    )
  })

  it("allows adjacent assignments that only touch", () => {
    const existing = makeAssignment({
      id: "a1",
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
    })
    const candidate = makeAssignment({
      date: "2026-09-03",
      startTime: "16:00",
      endTime: "00:00",
      isOvernight: true,
      shiftTypeId: "shift-evening",
    })

    const result = validateAssignment(makeContext({ assignments: [existing] }), candidate)

    expect(result.conflicts.filter((conflict) => conflict.code === "ASSIGNMENT_OVERLAP")).toEqual([])
    expect(result.valid).toBe(true)
  })

  it("flags overnight overlap into the next morning", () => {
    const existing = makeAssignment({
      id: "a1",
      date: "2026-09-03",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      shiftTypeId: "shift-night",
    })
    const candidate = makeAssignment({
      date: "2026-09-04",
      startTime: "05:00",
      endTime: "13:00",
      shiftTypeId: "shift-early",
    })

    const result = validateAssignment(makeContext({ assignments: [existing] }), candidate)

    expect(result.valid).toBe(false)
    expect(result.conflicts.some((conflict) => conflict.code === "ASSIGNMENT_OVERLAP")).toBe(true)
  })

  it("allows an overnight shift followed by a non-overlapping next-day shift", () => {
    const existing = makeAssignment({
      id: "a1",
      date: "2026-09-03",
      startTime: "22:00",
      endTime: "06:00",
      isOvernight: true,
      shiftTypeId: "shift-night",
    })
    const candidate = makeAssignment({
      date: "2026-09-04",
      startTime: "08:00",
      endTime: "16:00",
    })

    const result = validateAssignment(makeContext({ assignments: [existing] }), candidate)

    expect(result.conflicts.filter((conflict) => conflict.code === "ASSIGNMENT_OVERLAP")).toEqual([])
  })

  it("does not flag overlapping windows for different staff", () => {
    const existing = makeAssignment({
      id: "a1",
      date: "2026-09-03",
      staffId: "staff-ama",
    })
    const other = makeAssignment({
      id: "a2",
      date: "2026-09-03",
      staffId: "staff-kofi",
    })

    const conflicts = overlapRule.evaluate(makeContext({ assignments: [existing, other] }))

    expect(conflicts).toEqual([])
  })
})
