import { test, expect } from "@playwright/test"

const requiredHeaders = [
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
]

test("public pages send the configured security headers", async ({ request }) => {
  const response = await request.get("/login")
  expect(response.ok()).toBe(true)

  for (const name of requiredHeaders) {
    expect(response.headers()[name], name).toBeTruthy()
  }

  expect(response.headers()["x-content-type-options"]).toBe("nosniff")
  expect(response.headers()["x-frame-options"]).toBe("DENY")
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'")
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin")
})
