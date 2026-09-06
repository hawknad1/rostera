import { env, isProduction } from "@/lib/env"
import { NextResponse } from "next/server"

import {
  applyTwilioStatusCallback,
  validateTwilioRequestSignature,
} from "@/modules/notifications/services/webhooks"

function callbackUrl(request: Request) {
  const configured = env("TWILIO_STATUS_CALLBACK_URL")
  if (configured) {
    return configured
  }

  if (isProduction()) {
    return null
  }

  return request.url
}

export async function POST(request: Request) {
  const url = callbackUrl(request)
  if (!url) {
    return new NextResponse("Unauthorized", { status: 401 })
  }
  const form = await request.formData()
  const params: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") {
      params[key] = value
    }
  }

  const valid = validateTwilioRequestSignature({
    signature: request.headers.get("x-twilio-signature"),
    url,
    params,
  })

  if (!valid) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  await applyTwilioStatusCallback(params)
  return new NextResponse("OK", { status: 200 })
}

export function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 })
}
