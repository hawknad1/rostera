import { test, expect } from "@playwright/test"

test.describe("internal and webhook routes", () => {
  test("notification drain is session-exempt and fails closed without a secret", async ({
    request,
  }) => {
    const response = await request.post("/api/internal/notifications/drain")
    expect(response.status()).toBe(401)
    expect(response.headers()["location"] ?? "").not.toContain("/login")
    await expect(response.text()).resolves.toMatch(/unauthorized/i)
  })

  test("Twilio webhook is session-exempt and rejects missing signatures", async ({ request }) => {
    const response = await request.post("/api/webhooks/twilio/status", {
      form: { MessageSid: "SM-test", MessageStatus: "delivered" },
    })
    expect(response.status()).toBe(401)
    expect(response.headers()["location"] ?? "").not.toContain("/login")
  })

  test("wrong worker bearer token is rejected", async ({ request }) => {
    const response = await request.post("/api/internal/notifications/drain", {
      headers: { Authorization: "Bearer definitely-not-the-worker-secret" },
    })
    expect(response.status()).toBe(401)
  })
})
