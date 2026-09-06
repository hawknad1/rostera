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

export class ResendEmailProvider implements NotificationChannelProvider {
  readonly channel = "EMAIL" as const
  readonly provider = "RESEND" as const

  isConfigured() {
    return Boolean(env("RESEND_API_KEY") && env("RESEND_FROM_EMAIL"))
  }

  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    const apiKey = env("RESEND_API_KEY")
    const from = env("RESEND_FROM_EMAIL")

    if (!apiKey || !from) {
      throw new ChannelProviderError("CONFIGURATION", false, "email provider is not configured")
    }

    let response: Response

    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.destination],
          subject: input.subject ?? "Rostera notification",
          text: input.text,
          html: input.html,
        }),
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new ChannelProviderError("TIMEOUT", true, "email provider timeout")
    }

    if (!response.ok) {
      throw classifyHttpStatus(response.status)
    }

    const payload = (await response.json().catch(() => null)) as { id?: unknown } | null
    const id = typeof payload?.id === "string" ? payload.id : ""

    if (!id) {
      throw new ChannelProviderError("PROVIDER_UNAVAILABLE", true, "email provider returned no id")
    }

    return { providerMessageId: id }
  }
}
