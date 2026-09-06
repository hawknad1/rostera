import { createHmac, timingSafeEqual } from "node:crypto"

import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { env } from "@/lib/env"
import { adminSafeDeliveryError } from "@/modules/notifications/providers/errors"
import type { NotificationDeliveryProvider } from "@/modules/notifications/types/notification"
import type { PublicOrm } from "@/modules/notifications/types/orm"
import { db } from "@/prisma/db"
import { Temporal } from "temporal-polyfill"

export function validateTwilioRequestSignature(input: {
  signature: string | null
  url: string
  params: Record<string, string>
}) {
  const authToken = env("TWILIO_AUTH_TOKEN")
  if (!authToken || !input.signature) {
    return false
  }

  const data = Object.keys(input.params)
    .sort()
    .reduce((acc, key) => acc + key + input.params[key], input.url)
  const expected = createHmac("sha1", authToken).update(data).digest("base64")
  const left = Buffer.from(expected)
  const right = Buffer.from(input.signature)

  if (left.length !== right.length) {
    return false
  }

  return timingSafeEqual(left, right)
}

function mapTwilioStatus(status: string): "SENT" | "DELIVERED" | "FAILED" | null {
  switch (status.toLowerCase()) {
    case "queued":
    case "accepted":
    case "sending":
    case "sent":
      return "SENT"
    case "delivered":
    case "read":
      return "DELIVERED"
    case "undelivered":
    case "failed":
      return "FAILED"
    default:
      return null
  }
}

function canTransition(current: string, next: "SENT" | "DELIVERED" | "FAILED") {
  if (current === "CANCELLED" || current === "FAILED") {
    return false
  }

  if (current === "DELIVERED") {
    return false
  }

  if (next === "SENT" && (current === "SENT" || current === "DELIVERED")) {
    return false
  }

  return true
}

export async function applyTwilioStatusCallback(
  params: Record<string, string>,
  orm: PublicOrm = db.orm,
) {
  const messageSid = params.MessageSid ?? params.SmsSid ?? ""
  const messageStatus = params.MessageStatus ?? params.SmsStatus ?? ""
  const mapped = mapTwilioStatus(messageStatus)

  if (!messageSid || !mapped) {
    return { status: "IGNORED" as const }
  }

  const delivery = await orm.public.NotificationDelivery.where({
    providerMessageId: messageSid,
  }).first()

  if (!delivery) {
    return { status: "MISSING" as const }
  }

  const provider = String(delivery.provider) as NotificationDeliveryProvider
  const providerEventId = `${messageSid}:${messageStatus}`

  try {
    await orm.public.NotificationDeliveryReceipt.create({
      organizationId: delivery.organizationId,
      deliveryId: delivery.id,
      provider,
      providerEventId,
      status: mapped,
    })
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { status: "DUPLICATE" as const }
    }
    throw error
  }

  if (!canTransition(String(delivery.status), mapped)) {
    return { status: "NOOP" as const }
  }

  const now = Temporal.Now.instant()
  await orm.public.NotificationDelivery.where({
    id: delivery.id,
    organizationId: delivery.organizationId,
  }).update({
    status: mapped,
    ...(mapped === "DELIVERED" ? { deliveredAt: now } : {}),
    ...(mapped === "SENT" && !delivery.sentAt ? { sentAt: now } : {}),
    ...(mapped === "FAILED"
      ? {
          failedAt: now,
          lastError: adminSafeDeliveryError("REJECTED"),
        }
      : {}),
  })

  return { status: mapped }
}

export function timingSafeSecretEqual(provided: string, expected: string) {
  const left = Buffer.from(provided)
  const right = Buffer.from(expected)
  if (left.length !== right.length) {
    return false
  }

  return timingSafeEqual(left, right)
}

export function authorizeNotificationWorker(request: Request) {
  const secret = env("NOTIFICATION_WORKER_SECRET")
  if (!secret) {
    return false
  }

  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : ""
  return Boolean(token) && timingSafeSecretEqual(token, secret)
}
