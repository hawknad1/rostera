import { z } from "zod"

const DEFAULT_COUNTRY = "Ghana"
const DEFAULT_TIMEZONE = "Africa/Accra"

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

function isIanaTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional())

export const provisionOrganizationInputSchema = z.object({
  name: z.preprocess(
    emptyToUndefined,
    z.string("Hospital name is required.").trim().min(1, "Hospital name is required."),
  ),
  phone: optionalText,
  email: z.preprocess(emptyToUndefined, z.email("Enter a valid email address.").optional()),
  address: optionalText,
  city: optionalText,
  region: optionalText,
  country: z.preprocess(
    (value) => {
      const normalized = emptyToUndefined(value)
      return normalized === undefined ? DEFAULT_COUNTRY : normalized
    },
    z.string().trim().min(1).default(DEFAULT_COUNTRY),
  ),
  timezone: z.preprocess(
    (value) => {
      const normalized = emptyToUndefined(value)
      return normalized === undefined ? DEFAULT_TIMEZONE : normalized
    },
    z
      .string()
      .trim()
      .min(1)
      .refine(isIanaTimeZone, "Enter a valid timezone.")
      .default(DEFAULT_TIMEZONE),
  ),
  organizationType: z.enum(["HOSPITAL", "CLINIC", "HEALTH_SYSTEM", "OTHER"]).optional(),
})

export type ProvisionOrganizationInput = z.input<typeof provisionOrganizationInputSchema>
