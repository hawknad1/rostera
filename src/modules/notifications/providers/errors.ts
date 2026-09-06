export const channelProviderErrorCodes = [
  "TIMEOUT",
  "RATE_LIMIT",
  "PROVIDER_UNAVAILABLE",
  "INVALID_DESTINATION",
  "CONFIGURATION",
  "INVALID_TEMPLATE",
  "REJECTED",
] as const

export type ChannelProviderErrorCode = (typeof channelProviderErrorCodes)[number]

export class ChannelProviderError extends Error {
  readonly code: ChannelProviderErrorCode
  readonly retryable: boolean

  constructor(code: ChannelProviderErrorCode, retryable: boolean, message: string) {
    super(message)
    this.name = "ChannelProviderError"
    this.code = code
    this.retryable = retryable
  }
}

export function isChannelProviderError(error: unknown): error is ChannelProviderError {
  return error instanceof ChannelProviderError
}

export function sanitizedDeliveryError(error: unknown): { message: string; retryable: boolean } {
  if (isChannelProviderError(error)) {
    return {
      retryable: error.retryable,
      message: staffSafeDeliveryError(error.code),
    }
  }

  return {
    retryable: true,
    message: "The notification could not be delivered.",
  }
}

export function staffSafeDeliveryError(code: ChannelProviderErrorCode | string) {
  switch (code) {
    case "INVALID_DESTINATION":
      return "The destination was not eligible for this channel."
    case "CONFIGURATION":
      return "This channel is not available."
    case "INVALID_TEMPLATE":
      return "The notification could not be composed."
    case "RATE_LIMIT":
    case "TIMEOUT":
    case "PROVIDER_UNAVAILABLE":
      return "The notification could not be delivered. It will be retried."
    default:
      return "The notification could not be delivered."
  }
}

export function adminSafeDeliveryError(code: ChannelProviderErrorCode | string) {
  switch (code) {
    case "TIMEOUT":
      return "Provider timeout"
    case "RATE_LIMIT":
      return "Provider rate limited"
    case "PROVIDER_UNAVAILABLE":
      return "Provider unavailable"
    case "INVALID_DESTINATION":
      return "Invalid destination"
    case "CONFIGURATION":
      return "Provider configuration error"
    case "INVALID_TEMPLATE":
      return "Invalid template"
    case "REJECTED":
      return "Provider rejected the message"
    default:
      return "Delivery failed"
  }
}

export function classifyHttpStatus(status: number): ChannelProviderError {
  if (status === 429) {
    return new ChannelProviderError("RATE_LIMIT", true, "rate limited")
  }

  if (status === 401 || status === 403) {
    return new ChannelProviderError("CONFIGURATION", false, "authentication failed")
  }

  if (status === 400 || status === 404 || status === 422) {
    return new ChannelProviderError("INVALID_DESTINATION", false, "invalid request")
  }

  if (status >= 500) {
    return new ChannelProviderError("PROVIDER_UNAVAILABLE", true, "provider error")
  }

  return new ChannelProviderError("REJECTED", false, "provider rejected the message")
}
