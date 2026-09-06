import { enqueueNotificationEvent } from "@/modules/notifications/services/outbox"
import { processEmittedNotification } from "@/modules/notifications/services/processor"
import { processNotificationDeliveries } from "@/modules/notifications/services/worker"
import {
  NOTIFICATION_WORKER_BATCH_SIZE,
  type DomainNotificationEvent,
} from "@/modules/notifications/types/notification"
import type { TxClient } from "@/modules/notifications/types/orm"

export async function enqueueDomainNotification(
  tx: TxClient,
  event: DomainNotificationEvent,
) {
  await enqueueNotificationEvent(tx, event)
}

export async function processDomainNotification(event: {
  organizationId: string
  type: DomainNotificationEvent["type"]
  eventId: string
}) {
  await processEmittedNotification(event)
  try {
    await processNotificationDeliveries({ limit: NOTIFICATION_WORKER_BATCH_SIZE })
  } catch {
    // External delivery must not fail the committed domain operation.
  }
}
