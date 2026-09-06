import { describe, expect, it } from "vitest"

import {
  assertProductionConfiguration,
  missingRequiredProductionEnv,
  requiredForEmailEnv,
  requiredForSmsEnv,
  requiredForTwilioWebhooksEnv,
  requiredForWhatsAppEnv,
  requiredForWorkerEnv,
  requiredProductionEnv,
} from "@/lib/env"

describe("production configuration", () => {
  it("names required production variables without values", () => {
    expect([...requiredProductionEnv]).toEqual([
      "DATABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ])
    expect([...requiredForWorkerEnv]).toContain("NOTIFICATION_WORKER_SECRET")
    expect([...requiredForTwilioWebhooksEnv]).toContain("TWILIO_STATUS_CALLBACK_URL")
    expect([...requiredForEmailEnv]).toEqual(["RESEND_API_KEY", "RESEND_FROM_EMAIL"])
    expect([...requiredForSmsEnv]).toContain("TWILIO_FROM_NUMBER")
    expect([...requiredForWhatsAppEnv]).toContain("TWILIO_WHATSAPP_FROM")
  })

  it("reports missing required names without throwing secrets", () => {
    const missing = missingRequiredProductionEnv()
    expect(Array.isArray(missing)).toBe(true)
    for (const name of missing) {
      expect(name).toMatch(/^[A-Z0-9_]+$/)
    }
  })

  it("fails closed in production-style assertion when required names are absent", () => {
    if (missingRequiredProductionEnv().length === 0) {
      expect(() => assertProductionConfiguration()).not.toThrow()
      return
    }

    expect(() => assertProductionConfiguration()).toThrow(/Missing required production configuration/)
  })
})
