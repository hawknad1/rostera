import { describe, expect, it } from "vitest"

import { calculateFairness } from "@/modules/scheduling/engine/calculateFairness"
import { detectConflicts } from "@/modules/scheduling/engine/detectConflicts"
import { validateAssignment } from "@/modules/scheduling/engine/validateAssignment"
import { makeAssignment, makeContext, makeStaff } from "@/modules/scheduling/__tests__/helpers"

describe("scheduling engine", () => {
  it("returns multiple conflicts when multiple rules fail", () => {
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
      professionId: "prof-pharmacist",
    })

    const result = validateAssignment(
      makeContext({
        assignments: [existing],
        staff: [makeStaff({ professionId: "prof-nurse" })],
        config: { minimumRestMinutes: 720 },
      }),
      candidate,
    )

    const codes = result.conflicts.map((conflict) => conflict.code)
    expect(codes).toEqual(expect.arrayContaining(["ASSIGNMENT_OVERLAP", "QUALIFICATION_MISMATCH"]))
    expect(result.valid).toBe(false)
  })

  it("sets valid=false when a blocking conflict exists", () => {
    const result = validateAssignment(
      makeContext({
        assignments: [makeAssignment({ id: "a1", date: "2026-09-03" })],
      }),
      makeAssignment({
        date: "2026-09-03",
        startTime: "14:00",
        endTime: "22:00",
        shiftTypeId: "shift-late",
      }),
    )

    expect(result.conflicts.some((conflict) => conflict.blocking)).toBe(true)
    expect(result.valid).toBe(false)
  })

  it("does not set valid=false for a warning", () => {
    const result = detectConflicts(
      makeContext({
        roster: {
          id: "roster-a",
          departmentId: "dept-a",
          startDate: "2026-09-03",
          endDate: "2026-09-03",
        },
        requirements: [
          { shiftTypeId: "shift-day", professionId: "prof-nurse", requiredCount: 3 },
        ],
        assignments: [makeAssignment({ id: "a1", date: "2026-09-03" })],
      }),
    )

    expect(result.conflicts.some((conflict) => conflict.severity === "WARNING")).toBe(true)
    expect(result.valid).toBe(true)
  })

  it("does not set valid=false for info", () => {
    const result = detectConflicts(
      makeContext({
        roster: {
          id: "roster-a",
          departmentId: "dept-a",
          startDate: "2026-09-03",
          endDate: "2026-09-03",
        },
        requirements: [
          { shiftTypeId: "shift-day", professionId: "prof-nurse", requiredCount: 1 },
        ],
        assignments: [
          makeAssignment({ id: "a1", date: "2026-09-03", staffId: "staff-ama" }),
          makeAssignment({ id: "a2", date: "2026-09-03", staffId: "staff-kofi" }),
        ],
        staff: [makeStaff(), makeStaff({ id: "staff-kofi" })],
      }),
    )

    expect(result.conflicts.some((conflict) => conflict.severity === "INFO")).toBe(true)
    expect(result.valid).toBe(true)
  })

  it("returns conflicts in a deterministic order", () => {
    const context = makeContext({
      roster: {
        id: "roster-a",
        departmentId: "dept-a",
        startDate: "2026-09-03",
        endDate: "2026-09-03",
      },
      requirements: [
        { shiftTypeId: "shift-day", professionId: "prof-nurse", requiredCount: 3 },
      ],
      assignments: [makeAssignment({ id: "a1", date: "2026-09-03" })],
      staff: [makeStaff({ professionId: "prof-nurse" })],
    })
    const candidate = makeAssignment({
      date: "2026-09-03",
      startTime: "14:00",
      endTime: "22:00",
      shiftTypeId: "shift-late",
      professionId: "prof-pharmacist",
    })

    const first = validateAssignment(context, candidate)
    const second = validateAssignment(context, candidate)

    expect(first.conflicts.map((conflict) => [conflict.severity, conflict.code, conflict.rule])).toEqual(
      second.conflicts.map((conflict) => [conflict.severity, conflict.code, conflict.rule]),
    )
    expect(first.conflicts.map((conflict) => conflict.severity)).toEqual(
      [...first.conflicts.map((conflict) => conflict.severity)].sort((left, right) => {
        const order = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 }
        return order[left] - order[right]
      }),
    )
  })

  it("does not mutate input context or assignments", () => {
    const existing = makeAssignment({ id: "a1", date: "2026-09-03" })
    const assignments = [existing]
    const context = makeContext({ assignments })
    const snapshot = structuredClone({
      assignmentCount: context.assignments.length,
      firstId: context.assignments[0]?.id,
    })
    const candidate = makeAssignment({
      date: "2026-09-04",
    })

    Object.freeze(context)
    Object.freeze(context.assignments)
    Object.freeze(existing)

    validateAssignment(context, candidate)

    expect(context.assignments).toBe(assignments)
    expect(context.assignments).toHaveLength(snapshot.assignmentCount)
    expect(context.assignments[0]?.id).toBe(snapshot.firstId)
  })

  it("does not implement fairness scoring", () => {
    expect(calculateFairness(makeContext())).toEqual({ implemented: false })
  })
})
