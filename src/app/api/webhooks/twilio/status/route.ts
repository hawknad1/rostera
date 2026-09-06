import { NextResponse } from "next/server"

import {
  applyTwilioStatusCallback,
  validateTwilioRequestSignature,
} from "@/modules/notifications/services/webhooks"

function callbackUrl(request: Request) {
  return process.env.TWILIO_STATUS_CALLBACK_URL?.trim() || request.url
}

export async function POST(request: Request) {
  const form = await request.formData()
  const params: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") {
      params[key] = value
    }
  }

  const valid = validateTwilioRequestSignature({
    signature: request.headers.get("x-twilio-signature"),
    url: callbackUrl(request),
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
