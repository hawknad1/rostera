export function env(name: string) {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : null
}

export function isProduction() {
  return process.env.NODE_ENV === "production"
}

export const requiredProductionEnv = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const

export const requiredForEmailEnv = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"] as const

export const requiredForSmsEnv = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"] as const

export const requiredForWhatsAppEnv = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_FROM",
] as const

export const requiredForWorkerEnv = ["NOTIFICATION_WORKER_SECRET"] as const

export const requiredForTwilioWebhooksEnv = ["TWILIO_AUTH_TOKEN", "TWILIO_STATUS_CALLBACK_URL"] as const

export const optionalProductionEnv = [
  "DIRECT_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_NAME",
  "NOTIFICATION_WORKER_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "TWILIO_WHATSAPP_FROM",
  "TWILIO_STATUS_CALLBACK_URL",
  "TWILIO_CONTENT_SID",
] as const

export function missingRequiredProductionEnv() {
  return requiredProductionEnv.filter((name) => !env(name))
}

export function assertProductionConfiguration() {
  const missing = missingRequiredProductionEnv()
  if (missing.length === 0) {
    return
  }

  throw new Error(`Missing required production configuration: ${missing.join(", ")}`)
}
