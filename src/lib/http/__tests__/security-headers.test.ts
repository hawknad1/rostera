import { describe, expect, it } from "vitest"

import { contentSecurityPolicy, securityHeaders } from "../security-headers"

describe("security headers configuration", () => {
  it("declares production HTTP security headers", () => {
    const names = securityHeaders({ includeHsts: true }).map((header) => header.key)

    expect(names).toContain("Content-Security-Policy")
    expect(names).toContain("X-Content-Type-Options")
    expect(names).toContain("X-Frame-Options")
    expect(names).toContain("Referrer-Policy")
    expect(names).toContain("Permissions-Policy")
    expect(names).toContain("Strict-Transport-Security")

    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'")
    expect(contentSecurityPolicy).toContain("https://*.supabase.co")
  })
})
