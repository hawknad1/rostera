import { describe, expect, it } from "vitest"

import { assertSwapTransition } from "@/modules/shift-swaps/domain/status-transition"

describe("assertSwapTransition", () => {
  it("allows pending to completed, rejected, or cancelled", () => {
    expect(() => assertSwapTransition("PENDING", "COMPLETED")).not.toThrow()
    expect(() => assertSwapTransition("PENDING", "REJECTED")).not.toThrow()
    expect(() => assertSwapTransition("PENDING", "CANCELLED")).not.toThrow()
    expect(() => assertSwapTransition("PENDING", "APPROVED")).not.toThrow()
  })

  it("rejects invalid transitions", () => {
    expect(() => assertSwapTransition("APPROVED", "REJECTED")).toThrow(
      expect.objectContaining({ code: "SWAP_NOT_PENDING" }),
    )
    expect(() => assertSwapTransition("APPROVED", "CANCELLED")).toThrow(
      expect.objectContaining({ code: "SWAP_NOT_PENDING" }),
    )
    expect(() => assertSwapTransition("REJECTED", "APPROVED")).toThrow(
      expect.objectContaining({ code: "SWAP_NOT_PENDING" }),
    )
    expect(() => assertSwapTransition("REJECTED", "COMPLETED")).toThrow(
      expect.objectContaining({ code: "SWAP_NOT_PENDING" }),
    )
    expect(() => assertSwapTransition("CANCELLED", "APPROVED")).toThrow(
      expect.objectContaining({ code: "SWAP_NOT_PENDING" }),
    )
    expect(() => assertSwapTransition("COMPLETED", "PENDING")).toThrow(
      expect.objectContaining({ code: "SWAP_NOT_PENDING" }),
    )
    expect(() => assertSwapTransition("COMPLETED", "CANCELLED")).toThrow(
      expect.objectContaining({ code: "SWAP_NOT_PENDING" }),
    )
  })
})
