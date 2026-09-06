import { describe, expect, it } from "vitest"

import {
  createSwapInputSchema,
  rejectSwapInputSchema,
  swapIdInputSchema,
} from "@/modules/shift-swaps/schemas/swap"

describe("createSwapInputSchema", () => {
  const valid = {
    sourceAssignmentId: "assign-a",
    targetAssignmentId: "assign-b",
  }

  it("accepts valid assignment ids and optional reason", () => {
    expect(createSwapInputSchema.parse(valid)).toMatchObject(valid)
    expect(
      createSwapInputSchema.parse({
        ...valid,
        reason: "Family appointment",
      }),
    ).toMatchObject({ reason: "Family appointment" })
  })

  it("rejects missing ids", () => {
    expect(createSwapInputSchema.safeParse({ ...valid, sourceAssignmentId: "" }).success).toBe(
      false,
    )
    expect(createSwapInputSchema.safeParse({ ...valid, targetAssignmentId: "" }).success).toBe(
      false,
    )
  })

  it("rejects reasons over 2000 characters", () => {
    expect(
      createSwapInputSchema.safeParse({
        ...valid,
        reason: "x".repeat(2001),
      }).success,
    ).toBe(false)
  })

  it("treats blank reason as omitted", () => {
    expect(createSwapInputSchema.parse({ ...valid, reason: "   " }).reason).toBeUndefined()
  })
})

describe("swapIdInputSchema", () => {
  it("requires an id", () => {
    expect(swapIdInputSchema.safeParse({ id: "" }).success).toBe(false)
    expect(swapIdInputSchema.parse({ id: "swap-1" })).toEqual({ id: "swap-1" })
  })
})

describe("rejectSwapInputSchema", () => {
  it("accepts optional review notes", () => {
    expect(rejectSwapInputSchema.parse({ id: "swap-1" })).toEqual({ id: "swap-1" })
    expect(
      rejectSwapInputSchema.parse({ id: "swap-1", reviewNotes: "Coverage risk" }),
    ).toMatchObject({ reviewNotes: "Coverage risk" })
  })
})
