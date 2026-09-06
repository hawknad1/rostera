import {
  ChannelProviderError,
  classifyHttpStatus,
} from "@/modules/notifications/providers/errors"
import type {
  ChannelSendInput,
  ChannelSendResult,
  NotificationChannelProvider,
} from "@/modules/notifications/providers/types"

function env(name: string) {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : null
}

function twilioAuthHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`
}

async function sendTwilioMessage(input: {
  accountSid: string
  authToken: string
  from: string
  to: string
  body: string
  statusCallback?: string | null
}): Promise<ChannelSendResult> {
  const params = new URLSearchParams()
  params.set("From", input.from)
  params.set("To", input.to)
  params.set("Body", input.body)
  if (input.statusCallback) {
    params.set("StatusCallback", input.statusCallback)
  }

  let response: Response

  try {
    response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(input.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: twilioAuthHeader(input.accountSid, input.authToken),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
        signal: AbortSignal.timeout(15_000),
      },
    )
  } catch {
    throw new ChannelProviderError("TIMEOUT", true, "messaging provider timeout")
  }

  if (!response.ok) {
    throw classifyHttpStatus(response.status)
  }

  const payload = (await response.json().catch(() => null)) as { sid?: unknown } | null
  const sid = typeof payload?.sid === "string" ? payload.sid : ""

  if (!sid) {
    throw new ChannelProviderError("PROVIDER_UNAVAILABLE", true, "messaging provider returned no id")
  }

  return { providerMessageId: sid }
}

export class TwilioSmsProvider implements NotificationChannelProvider {
  readonly channel = "SMS" as const
  readonly provider = "TWILIO_SMS" as const

  isConfigured() {
    return Boolean(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && env("TWILIO_SMS_FROM"))
  }

  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    const accountSid = env("TWILIO_ACCOUNT_SID")
    const authToken = env("TWILIO_AUTH_TOKEN")
    const from = env("TWILIO_SMS_FROM")

    if (!accountSid || !authToken || !from) {
      throw new ChannelProviderError("CONFIGURATION", false, "sms provider is not configured")
    }

    return sendTwilioMessage({
      accountSid,
      authToken,
      from,
      to: input.destination,
      body: input.text,
      statusCallback: env("TWILIO_STATUS_CALLBACK_URL"),
    })
  }
}

export class TwilioWhatsAppProvider implements NotificationChannelProvider {
  readonly channel = "WHATSAPP" as const
  readonly provider = "TWILIO_WHATSAPP" as const

  isConfigured() {
    return Boolean(
      env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && env("TWILIO_WHATSAPP_FROM"),
    )
  }

  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    const accountSid = env("TWILIO_ACCOUNT_SID")
    const authToken = env("TWILIO_AUTH_TOKEN")
    const fromRaw = env("TWILIO_WHATSAPP_FROM")

    if (!accountSid || !authToken || !fromRaw) {
      throw new ChannelProviderError("CONFIGURATION", false, "whatsapp provider is not configured")
    }

    const from = fromRaw.startsWith("whatsapp:") ? fromRaw : `whatsapp:${fromRaw}`
    const to = input.destination.startsWith("whatsapp:")
      ? input.destination
      : `whatsapp:${input.destination}`

    const contentSid = env("TWILIO_WHATSAPP_CONTENT_SID")
    if (contentSid) {
      return sendTwilioContentMessage({
        accountSid,
        authToken,
        from,
        to,
        contentSid,
        statusCallback: env("TWILIO_STATUS_CALLBACK_URL"),
      })
    }

    return sendTwilioMessage({
      accountSid,
      authToken,
      from,
      to,
      body: input.text,
      statusCallback: env("TWILIO_STATUS_CALLBACK_URL"),
    })
  }
}

async function sendTwilioContentMessage(input: {
  accountSid: string
  authToken: string
  from: string
  to: string
  contentSid: string
  statusCallback?: string | null
}): Promise<ChannelSendResult> {
  const params = new URLSearchParams()
  params.set("From", input.from)
  params.set("To", input.to)
  params.set("ContentSid", input.contentSid)
  if (input.statusCallback) {
    params.set("StatusCallback", input.statusCallback)
  }

  let response: Response

  try {
    response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(input.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: twilioAuthHeader(input.accountSid, input.authToken),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
        signal: AbortSignal.timeout(15_000),
      },
    )
  } catch {
    throw new ChannelProviderError("TIMEOUT", true, "messaging provider timeout")
  }

  if (!response.ok) {
    throw classifyHttpStatus(response.status)
  }

  const payload = (await response.json().catch(() => null)) as { sid?: unknown } | null
  const sid = typeof payload?.sid === "string" ? payload.sid : ""

  if (!sid) {
    throw new ChannelProviderError("PROVIDER_UNAVAILABLE", true, "messaging provider returned no id")
  }

  return { providerMessageId: sid }
}
