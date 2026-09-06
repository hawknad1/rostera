import { describe, expect, it } from "vitest"

import { createLeaveInputSchema, leaveIdInputSchema } from "@/modules/leave/schemas/leave"

describe("createLeaveInputSchema", () => {
  const valid = {
    staffId: "staff-ama",
    leaveType: "ANNUAL",
    startDate: "2026-09-10",
    endDate: "2026-09-12",
  }

  it("accepts valid dates, types, and optional notes", () => {
    expect(createLeaveInputSchema.parse(valid)).toMatchObject(valid)
    expect(
      createLeaveInputSchema.parse({
        ...valid,
        notes: "Family event",
      }),
    ).toMatchObject({ notes: "Family event" })
    expect(
      createLeaveInputSchema.parse({
        leaveType: "SICK",
        startDate: "2026-09-10",
        endDate: "2026-09-10",
      }),
    ).toMatchObject({
      leaveType: "SICK",
      startDate: "2026-09-10",
      endDate: "2026-09-10",
    })
  })

  it("rejects start after end", () => {
    const result = createLeaveInputSchema.safeParse({
      ...valid,
      startDate: "2026-09-12",
      endDate: "2026-09-10",
    })

    expect(result.success).toBe(false)
  })

  it("rejects invalid leave types", () => {
    const result = createLeaveInputSchema.safeParse({
      ...valid,
      leaveType: "VACATION",
    })

    expect(result.success).toBe(false)
  })

  it("rejects malformed dates", () => {
    expect(
      createLeaveInputSchema.safeParse({
        ...valid,
        startDate: "10-09-2026",
      }).success,
    ).toBe(false)
    expect(
      createLeaveInputSchema.safeParse({
        ...valid,
        endDate: "2026/09/12",
      }).success,
    ).toBe(false)
    expect(
      createLeaveInputSchema.safeParse({
        ...valid,
        startDate: "",
      }).success,
    ).toBe(false)
  })

  it("treats blank notes as omitted", () => {
    expect(
      createLeaveInputSchema.parse({
        ...valid,
        notes: "   ",
      }).notes,
    ).toBeUndefined()
  })
})

describe("leaveIdInputSchema", () => {
  it("requires an id", () => {
    expect(leaveIdInputSchema.safeParse({ id: "" }).success).toBe(false)
    expect(leaveIdInputSchema.parse({ id: "leave-1" })).toEqual({ id: "leave-1" })
  })
})
