import { Temporal } from "temporal-polyfill"

import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { resolveNotificationIntents } from "@/modules/notifications/services/recipients"
import type {
  DomainNotificationEvent,
  OutboxPayload,
} from "@/modules/notifications/types/notification"
import type { TxClient } from "@/modules/notifications/types/orm"

export async function enqueueNotificationEvent(
  tx: TxClient,
  event: DomainNotificationEvent,
) {
  const intents = await resolveNotificationIntents(tx.orm, event)
  const payload: OutboxPayload = {
    actorUserId: event.actorUserId,
    intents,
  }

  try {
    return await tx.orm.public.NotificationOutbox.create({
      organizationId: event.organizationId,
      eventType: event.type,
      eventId: event.eventId,
      payload: JSON.stringify(payload),
      status: "PENDING",
      attempts: 0,
      availableAt: Temporal.Now.instant(),
    })
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return tx.orm.public.NotificationOutbox.where({
        organizationId: event.organizationId,
        eventType: event.type,
        eventId: event.eventId,
      }).first()
    }

    throw error
  }
}
