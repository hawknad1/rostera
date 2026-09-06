import { describe, expect, it } from "vitest"

import { assertRosterTransition } from "@/modules/rosters/validation/status-transition"

function expectTransitionError(from: string, to: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "AMENDED", code: string) {
  try {
    assertRosterTransition(from, to)
    throw new Error("expected transition to fail")
  } catch (error) {
    expect(error).toMatchObject({
      name: "RosterError",
      code,
    })
  }
}

describe("assertRosterTransition", () => {
  it("allows DRAFT to IN_REVIEW", () => {
    expect(() => assertRosterTransition("DRAFT", "IN_REVIEW")).not.toThrow()
  })

  it("allows IN_REVIEW to DRAFT and PUBLISHED", () => {
    expect(() => assertRosterTransition("IN_REVIEW", "DRAFT")).not.toThrow()
    expect(() => assertRosterTransition("IN_REVIEW", "PUBLISHED")).not.toThrow()
  })

  it("rejects DRAFT to PUBLISHED", () => {
    expectTransitionError("DRAFT", "PUBLISHED", "ROSTER_NOT_PUBLISHABLE")
  })

  it("rejects PUBLISHED to any status", () => {
    expectTransitionError("PUBLISHED", "DRAFT", "ROSTER_ALREADY_PUBLISHED")
    expectTransitionError("PUBLISHED", "IN_REVIEW", "ROSTER_ALREADY_PUBLISHED")
    expectTransitionError("PUBLISHED", "PUBLISHED", "ROSTER_ALREADY_PUBLISHED")
  })

  it("rejects AMENDED transitions", () => {
    expectTransitionError("AMENDED", "DRAFT", "INVALID_ROSTER_TRANSITION")
  })

  it("rejects DRAFT to DRAFT", () => {
    expectTransitionError("DRAFT", "DRAFT", "INVALID_ROSTER_TRANSITION")
  })
})
