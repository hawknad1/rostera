import { describe, expect, it } from "vitest"

import { isAuthRoute, isSessionExemptPath, shouldBypassSessionRefresh } from "../request-access"

describe("session-exempt request paths", () => {
  it("keeps login and supabase auth routes as auth routes", () => {
    expect(isAuthRoute("/login")).toBe(true)
    expect(isAuthRoute("/auth/callback")).toBe(true)
    expect(isAuthRoute("/dashboard")).toBe(false)
  })

  it("does not require a browser session for webhooks, workers, or invite links", () => {
    expect(isSessionExemptPath("/api/webhooks/twilio/status")).toBe(true)
    expect(isSessionExemptPath("/api/internal/notifications/drain")).toBe(true)
    expect(isSessionExemptPath("/invite/accept")).toBe(true)
    expect(isSessionExemptPath("/sw.js")).toBe(true)
    expect(isSessionExemptPath("/manifest.webmanifest")).toBe(true)
    expect(isSessionExemptPath("/dashboard")).toBe(false)
    expect(isSessionExemptPath("/settings/users")).toBe(false)
  })

  it("skips supabase session refresh for secret-protected internal routes", () => {
    expect(shouldBypassSessionRefresh("/api/webhooks/twilio/status")).toBe(true)
    expect(shouldBypassSessionRefresh("/api/internal/notifications/drain")).toBe(true)
    expect(shouldBypassSessionRefresh("/invite/accept")).toBe(false)
  })
})
