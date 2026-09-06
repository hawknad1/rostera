import { Temporal } from "temporal-polyfill"
import { describe, expect, it } from "vitest"

import { validateAssignment } from "@/modules/scheduling/engine/validateAssignment"
import { makeAssignment, makeContext } from "@/modules/scheduling/__tests__/helpers"

describe("leave conflict rule", () => {
  const assignment = makeAssignment({
    date: "2026-09-11",
    startTime: "22:00",
    endTime: "06:00",
    isOvernight: true,
    shiftTypeId: "shift-night",
  })

  it("flags approved leave that overlaps an assignment", () => {
    const result = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            start: Temporal.Instant.from("2026-09-10T00:00:00Z"),
            end: Temporal.Instant.from("2026-09-12T23:59:00Z"),
          },
        ],
      }),
      assignment,
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
            start: Temporal.Instant.from("2026-09-10T00:00:00Z"),
            end: Temporal.Instant.from("2026-09-12T23:59:00Z"),
          },
        ],
      }),
      assignment,
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
            start: Temporal.Instant.from("2026-09-10T00:00:00Z"),
            end: Temporal.Instant.from("2026-09-12T23:59:00Z"),
          },
        ],
      }),
      assignment,
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
            start: Temporal.Instant.from("2026-09-10T00:00:00Z"),
            end: Temporal.Instant.from("2026-09-12T23:59:00Z"),
          },
        ],
      }),
      assignment,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual([])
  })

  it("allows leave that only touches the assignment boundary", () => {
    const day = makeAssignment({
      date: "2026-09-11",
      startTime: "08:00",
      endTime: "16:00",
    })

    const result = validateAssignment(
      makeContext({
        leavePeriods: [
          {
            staffId: "staff-ama",
            status: "APPROVED",
            start: Temporal.Instant.from("2026-09-10T00:00:00Z"),
            end: Temporal.Instant.from("2026-09-11T08:00:00Z"),
          },
        ],
      }),
      day,
    )

    expect(result.conflicts.filter((conflict) => conflict.code === "LEAVE_CONFLICT")).toEqual([])
  })
})
