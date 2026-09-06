import { ResendEmailProvider } from "@/modules/notifications/providers/resend-email"
import { TwilioSmsProvider, TwilioWhatsAppProvider } from "@/modules/notifications/providers/twilio"
import type { NotificationChannelProvider } from "@/modules/notifications/providers/types"
import type { NotificationChannel } from "@/modules/notifications/types/notification"

const productionProviders: NotificationChannelProvider[] = [
  new ResendEmailProvider(),
  new TwilioSmsProvider(),
  new TwilioWhatsAppProvider(),
]

let testProviders: NotificationChannelProvider[] | null = null

export function setNotificationProvidersForTests(providers: NotificationChannelProvider[] | null) {
  testProviders = providers
}

function isTestRuntime() {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test"
}

export function getNotificationProviders(): NotificationChannelProvider[] {
  if (testProviders) {
    return testProviders
  }

  if (isTestRuntime()) {
    return []
  }

  return productionProviders
}

export function getProviderForChannel(channel: Exclude<NotificationChannel, "IN_APP">) {
  return getNotificationProviders().find((provider) => provider.channel === channel) ?? null
}

export function isChannelProviderConfigured(channel: Exclude<NotificationChannel, "IN_APP">) {
  return getProviderForChannel(channel)?.isConfigured() === true
}

export function getConfiguredChannelAvailability() {
  return {
    email: isChannelProviderConfigured("EMAIL"),
    sms: isChannelProviderConfigured("SMS"),
    whatsapp: isChannelProviderConfigured("WHATSAPP"),
  }
}
