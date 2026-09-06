import { describe, expect, it } from "vitest"

import { safeInternalPath } from "../safe-path"

describe("safeInternalPath", () => {
  it("allows same-origin relative paths including query strings", () => {
    expect(safeInternalPath("/invite/accept?token=abc")).toBe("/invite/accept?token=abc")
    expect(safeInternalPath("/dashboard")).toBe("/dashboard")
  })

  it("rejects open redirects", () => {
    expect(safeInternalPath("https://evil.example")).toBeNull()
    expect(safeInternalPath("//evil.example")).toBeNull()
    expect(safeInternalPath("/\\evil.example")).toBeNull()
    expect(safeInternalPath("/login@evil.example")).toBeNull()
    expect(safeInternalPath(null)).toBeNull()
  })
})
