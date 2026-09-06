import type { NotificationChannel, NotificationIntent } from "@/modules/notifications/types/notification"

export type RenderedChannelContent = {
  templateKey: string
  subject?: string
  text: string
  html?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function templateKey(type: string, channel: NotificationChannel) {
  return `rostera.${type.toLowerCase()}.${channel.toLowerCase()}`
}

export function renderChannelContent(
  intent: NotificationIntent,
  channel: NotificationChannel,
): RenderedChannelContent {
  const title = intent.title.trim()
  const body = intent.body.trim()
  const key = templateKey(intent.type, channel)

  if (channel === "EMAIL") {
    return {
      templateKey: key,
      subject: title,
      text: `${title}\n\n${body}`,
      html: `<!DOCTYPE html><html><body><p>${escapeHtml(title)}</p><p>${escapeHtml(body)}</p></body></html>`,
    }
  }

  if (channel === "SMS") {
    const sms = `${title}: ${body}`
    return {
      templateKey: key,
      text: sms.length > 320 ? `${sms.slice(0, 317)}...` : sms,
    }
  }

  if (channel === "WHATSAPP") {
    return {
      templateKey: key,
      text: `${title}\n${body}`,
    }
  }

  return {
    templateKey: key,
    text: body,
  }
}
