import { describe, expect, it } from "vitest"

import {
  parseAuditMetadata,
  sanitizeAuditMetadata,
  serializeAuditMetadata,
} from "@/modules/audit/sanitize"

describe("audit metadata sanitizer", () => {
  it("redacts sensitive keys at any nesting level", () => {
    const sanitized = sanitizeAuditMetadata({
      after: {
        name: "Ama",
        password: "hunter2",
        token: "abc",
        nested: {
          refreshToken: "r",
          accessToken: "a",
          otp: "123456",
          apiKey: "k",
          session: { id: "s" },
        },
      },
      authorization: "Bearer secret",
      cookie: "sid=1",
      secret: "x",
      credential: "y",
      privateKey: "z",
    }) as Record<string, unknown>

    const after = sanitized.after as Record<string, unknown>
    const nested = after.nested as Record<string, unknown>

    expect(after.name).toBe("Ama")
    expect(after.password).toBe("[redacted]")
    expect(after.token).toBe("[redacted]")
    expect(nested.refreshToken).toBe("[redacted]")
    expect(nested.accessToken).toBe("[redacted]")
    expect(nested.otp).toBe("[redacted]")
    expect(nested.apiKey).toBe("[redacted]")
    expect(nested.session).toBe("[redacted]")
    expect(sanitized.authorization).toBe("[redacted]")
    expect(sanitized.cookie).toBe("[redacted]")
    expect(sanitized.secret).toBe("[redacted]")
    expect(sanitized.credential).toBe("[redacted]")
    expect(sanitized.privateKey).toBe("[redacted]")
  })

  it("serializes redacted JSON for storage", () => {
    const raw = serializeAuditMetadata({
      password: "secret",
      after: { status: "DRAFT" },
    })

    expect(raw).toContain("[redacted]")
    expect(raw).not.toContain("secret")
    expect(parseAuditMetadata(raw)).toMatchObject({
      password: "[redacted]",
      after: { status: "DRAFT" },
    })
  })
})
