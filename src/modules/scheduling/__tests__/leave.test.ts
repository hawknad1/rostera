import { describe, expect, it } from "vitest"

import { validateAssignment } from "@/modules/scheduling/engine/validateAssignment"
import { detectConflicts } from "@/modules/scheduling/engine/detectConflicts"
import { makeAssignment, makeContext } from "@/modules/scheduling/__tests__/helpers"

describe("leave conflict rule", () => {
  const day = makeAssignment({
    date: "2026-09-11",
    startTime: "08:00",
    endTime: "16:00",
  })

  const overnight = makeAssignment({
    date: "2026-09-11",
    startTime: "22:00",
    endTime: "06:00",
    isOvernight: true,
    shiftTypeId: "shift-night",
  })

  it("flags approved leave that covers the assignment date", () => {
    const result = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            startDate: "2026-09-10",
            endDate: "2026-09-12",
          },
        ],
      }),
      overnight,
    )

    expect(result.valid).toBe(false)
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "LEAVE_CONFLICT",
          severity: "ERROR",
          blocking: true,
        }),
      ]),
    )
  })

  it("ignores pending leave", () => {
    const result = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "PENDING",
            startDate: "2026-09-10",
            endDate: "2026-09-12",
          },
        ],
      }),
      overnight,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual([])
  })

  it("ignores rejected leave", () => {
    const result = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "REJECTED",
            startDate: "2026-09-10",
            endDate: "2026-09-12",
          },
        ],
      }),
      overnight,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual([])
  })

  it("ignores cancelled leave", () => {
    const result = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "CANCELLED",
            startDate: "2026-09-10",
            endDate: "2026-09-12",
          },
        ],
      }),
      overnight,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual([])
  })

  it("blocks a day assignment on the first and last leave dates", () => {
    const first = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            startDate: "2026-09-10",
            endDate: "2026-09-12",
          },
        ],
      }),
      makeAssignment({ date: "2026-09-10" }),
    )
    const last = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            startDate: "2026-09-10",
            endDate: "2026-09-12",
          },
        ],
      }),
      makeAssignment({ date: "2026-09-12" }),
    )

    expect(first.valid).toBe(false)
    expect(last.valid).toBe(false)
  })

  it("allows assignments on adjacent dates before and after leave", () => {
    const before = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            startDate: "2026-09-10",
            endDate: "2026-09-12",
          },
        ],
      }),
      makeAssignment({ date: "2026-09-09" }),
    )
    const after = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            startDate: "2026-09-10",
            endDate: "2026-09-12",
          },
        ],
      }),
      makeAssignment({ date: "2026-09-13" }),
    )

    expect(before.conflicts.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual([])
    expect(after.conflicts.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual([])
  })

  it("uses the assignment date for overnight shifts, not the end calendar day", () => {
    const leaveOnStart = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            startDate: "2026-09-11",
            endDate: "2026-09-11",
          },
        ],
      }),
      overnight,
    )
    const leaveOnEndOnly = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            startDate: "2026-09-12",
            endDate: "2026-09-12",
          },
        ],
      }),
      overnight,
    )
    const previousNight = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            startDate: "2026-09-10",
            endDate: "2026-09-10",
          },
        ],
      }),
      makeAssignment({
        date: "2026-09-09",
        startTime: "22:00",
        endTime: "06:00",
        isOvernight: true,
        shiftTypeId: "shift-night",
      }),
    )

    expect(leaveOnStart.valid).toBe(false)
    expect(leaveOnEndOnly.conflicts.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual(
      [],
    )
    expect(previousNight.conflicts.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual(
      [],
    )
  })

  it("returns multiple leave conflicts across a roster", () => {
    const result = detectConflicts(
      makeContext({
        assignments: [
          day,
          makeAssignment({
            id: "a-kofi",
            date: "2026-09-10",
            staffId: "staff-kofi",
          }),
        ],
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            startDate: "2026-09-11",
            endDate: "2026-09-11",
          },
          {
            staffId: "staff-kofi",
            status: "APPROVED",
            startDate: "2026-09-10",
            endDate: "2026-09-12",
          },
        ],
      }),
    )

    const leaveConflicts = result.conflicts.filter((conflict) => conflict.code === "LEAVE_CONFLICT")
    expect(leaveConflicts).toHaveLength(2)
  })
})
