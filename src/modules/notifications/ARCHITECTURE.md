# Notification infrastructure

Phase 3J added a tenant-scoped outbox and in-app inbox. Phase 3N extends that foundation with durable channel delivery. Domain services still never call providers.

```
                 ┌────────────────────┐
                 │   Business Action  │
                 │ Leave / Roster /   │
                 │ Swap / etc.        │
                 └─────────┬──────────┘
                           │
                    SAME TRANSACTION
                           │
                 ┌─────────▼──────────┐
                 │ NotificationOutbox │
                 └─────────┬──────────┘
                           │
                        COMMIT
                           │
                 ┌─────────▼──────────┐
                 │ Notification Worker│
                 └─────────┬──────────┘
                           │
                ┌──────────▼───────────┐
                │ Channel Resolution   │
                │ Preferences + Policy │
                └──────────┬───────────┘
             ┌─────────────┼──────────────┐
        ┌────▼────┐   ┌────▼────┐   ┌────▼──────┐
        │  Email  │   │   SMS   │   │ WhatsApp  │
        │ Provider│   │ Provider│   │  Provider │
        └────┬────┘   └────┬────┘   └────┬──────┘
             └─────────────┼──────────────┘
                           │
                  NotificationDelivery
```

Critical invariants:

```
Provider failure ≠ business transaction failure
Duplicate processing ≠ duplicate communication
In-app delivery does not depend on email/SMS/WhatsApp
```

## Module layout

```
src/modules/notifications/
├── types/            event types, channels, delivery statuses
├── schemas/          trusted intents and preference input
├── channels/         event matrix and channel resolver
├── templates/        server-side channel copy
├── providers/        channel interfaces and adapters
├── services/         outbox, processor, worker, preferences, history, webhooks
├── actions/          inbox and preference mutations (no send API)
├── ui/
└── ARCHITECTURE.md
```

## Notification event

Authoritative types remain the Phase 3J enum. External delivery does not invent new event types.

Event identity is still the domain row id. Leave approval and leave request share `eventId` and differ by `eventType`.

## Outbox

`NotificationOutbox` is the durable business-event source. It is written in the same transaction as the domain mutation.

After commit, `processDomainNotification` processes the outbox and then attempts a bounded delivery drain. Errors are swallowed so a provider outage cannot roll back leave, roster, or swap state.

`processingStartedAt` is a lease. `PROCESSING` rows older than 120 seconds are reclaimed to `PENDING`.

## In-app notification

`Notification` remains the user inbox row. The in-app channel still uses unique `(organizationId, recipientUserId, type, eventId)`.

In-app delivery runs during outbox processing, before external sends. If SMS or email is down, the inbox row is still created.

## Delivery records

`NotificationDelivery` tracks channel attempts. It is not overloaded onto `Notification`.

| Field | Purpose |
| --- | --- |
| `organizationId` | tenant scope |
| `notificationOutboxId` | originating outbox event |
| `recipientUserId` | Rostera user |
| `eventType` + `eventId` + `channel` | idempotency identity |
| `provider` | `IN_APP`, `RESEND`, `TWILIO_SMS`, `TWILIO_WHATSAPP` |
| `status` | lifecycle, see below |
| `destination` | actual destination; UI and logs mask it |
| `attemptCount` / `availableAt` / `processingStartedAt` | retry and lease |
| `providerMessageId` | provider-accepted id, used by webhooks |
| `lastError` | sanitized admin reason, never raw API bodies |

Missing destinations are **not eligible**. No delivery row is created, so the worker does not retry an absent phone or email.

## Delivery state machine

```
PENDING
  → PROCESSING          worker claimed the row
      → SENT            provider accepted the message
          → DELIVERED   verified receipt webhook, where supported
      → FAILED          terminal failure after bounded retries or a permanent error
      → CANCELLED       not sendable (missing provider, invalid channel)
PROCESSING (lease expired)
  → PENDING             reclaim
```

`SENT` means the provider accepted the request. `DELIVERED` is used only after a verified status callback. In-app rows are marked `DELIVERED` because persistence in the inbox is delivery.

Do not mark SMS/email `DELIVERED` because an HTTP 200 was returned.

## Channel resolver

`resolveNotificationChannels` is the only place that decides whether a delivery row should exist. Leave, roster, and swap services do not select channels.

Policy lives in `channels/registry.ts`:

| Event | Priority | Default channels |
| --- | --- | --- |
| `ROSTER_PUBLISHED` | operational | IN_APP, EMAIL, SMS, WHATSAPP |
| `LEAVE_APPROVED` | operational | IN_APP, EMAIL, SMS |
| `LEAVE_REJECTED` | operational | IN_APP, EMAIL |
| `SHIFT_SWAP_COMPLETED` | operational | IN_APP, EMAIL, SMS |
| Other current events | optional | IN_APP, EMAIL |

IN_APP cannot be disabled. Operational EMAIL cannot be disabled. SMS and WhatsApp follow preferences even for operational events. This is a product policy, not a legal claim.

A channel is eligible only when:

1. it is allowed for the event
2. the provider is configured
3. the recipient has a valid destination
4. the preference/default enables it, or the channel is locked on

There is no automatic fallback from email to SMS.

## Providers

```
worker → NotificationChannelProvider.send() → configured adapter
```

Domain services must not import Resend or Twilio.

| Channel | Adapter | Environment |
| --- | --- | --- |
| EMAIL | `ResendEmailProvider` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| SMS | `TwilioSmsProvider` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM` |
| WHATSAPP | `TwilioWhatsAppProvider` | same Twilio account plus `TWILIO_WHATSAPP_FROM` |

Optional: `TWILIO_STATUS_CALLBACK_URL`, `TWILIO_WHATSAPP_CONTENT_SID`.

Vitest does not use production providers unless a test injects mocks. Production reads environment variables on the server only.

Retryable errors: timeout, HTTP 429, HTTP 5xx. Permanent errors: invalid destination, authentication/configuration, malformed template/request. Max 5 attempts with exponential backoff capped at 600 seconds.

## Templates

Trusted server-side event payloads are rendered per channel. Email HTML is generated and escaped on the server. Clients cannot submit HTML or provider template ids.

WhatsApp production messaging often requires an approved provider template. If `TWILIO_WHATSAPP_CONTENT_SID` is set, that Content SID is sent. Otherwise the adapter sends a body, which is suitable for sandbox/dev and must not be assumed valid for all production WhatsApp traffic.

## Preferences

`NotificationPreference` stores explicit overrides. No row means the registry default.

Staff edit their own preferences at `/me/notifications/preferences`. They cannot edit another user. IN_APP and operational EMAIL are locked.

Preference changes are not audited as user-facing audit events. Delivery retries are not audited. Delivery history is the operational record.

## Worker

`drainNotificationWork()`:

1. reclaim stuck outbox and delivery leases
2. process due `NotificationOutbox` rows (in-app + ensure deliveries)
3. claim and send due external `NotificationDelivery` rows

Batch size is 25. One failed send does not abort the batch.

Invocation:

- After a domain commit, `processDomainNotification` attempts a bounded drain.
- Production should also call `POST /api/internal/notifications/drain` with `Authorization: Bearer $NOTIFICATION_WORKER_SECRET` from Vercel cron or an equivalent scheduler.

The drain route is not a public send API. If the secret is unset, every request is rejected.

This is a modular worker, not a microservice and not `void processDelivery()`.

## Webhooks

`POST /api/webhooks/twilio/status` validates `X-Twilio-Signature` against `TWILIO_AUTH_TOKEN` and `TWILIO_STATUS_CALLBACK_URL`. Unauthenticated callbacks are rejected. `DELIVERED` is applied only after a valid signature.

Webhook idempotency uses `NotificationDeliveryReceipt` unique `(organizationId, provider, providerEventId)`.

Resend delivery webhooks are not implemented in this phase. Email therefore stays `SENT` unless a later adapter maps Resend receipts.

## Idempotency

Database uniqueness, not `if (!exists)`:

- Outbox: `(organizationId, eventType, eventId)`
- Inbox: `(organizationId, recipientUserId, type, eventId)`
- Delivery: `(organizationId, eventType, eventId, recipientUserId, channel)`
- Receipt: `(organizationId, provider, providerEventId)`

Concurrent workers claim with `PENDING → PROCESSING`. The second update returns no row.

## Contact information

Canonical sources: `User.email` / `User.phone`, falling back to the linked `StaffProfile` in the same organization. Phone numbers must already be E.164; the utility does not prefix a Ghana country code.

## Admin and staff UI

- Staff inbox: `/me/notifications` and `/notifications`
- Staff preferences: `/me/notifications/preferences`
- Admin delivery history: `/notifications/deliveries` (`notifications.view`)
- Settings shows configured/not configured only; no secrets

Destinations are masked in the admin table and in operational logs.

## Tenant isolation

Every delivery query includes `organizationId` from the active membership. Staff without `notifications.view` cannot load delivery history. Inbox queries still include `organizationId` and `recipientUserId`.

## Secrets and logging

Never log or return Twilio tokens, Resend keys, authorization headers, full phone numbers, or full email bodies. Logs may include `eventType`, `channel`, `provider`, `deliveryId`, `attempt`, `status`, `providerMessageId`, and a masked destination.

## Future queue migration

`drainNotificationWork` is the stable entry. A later Vercel cron, queue consumer, or dedicated worker can call it without changing leave/roster/swap services. Do not introduce Redis, Kafka, or RabbitMQ for this phase.

## Known limitations

- Prisma 8 equality `where` still loads by status and filters `availableAt` in memory.
- Resend delivery receipts are not implemented.
- WhatsApp production templates may require a Content SID.
- No automatic channel fallback.
- No provider credential vault; configuration is environment-based.
- No native push, marketing, or bulk campaigns.
- Browser QA against live Twilio/Resend was not part of implementation unless credentials and a running UI session are available.
