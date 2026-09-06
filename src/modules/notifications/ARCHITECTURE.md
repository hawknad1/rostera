# Notification infrastructure

Phase 3J adds a tenant-scoped, channel-agnostic notification foundation. Domain services emit a durable outbox intent after the business write succeeds in the same transaction. In-app delivery is the only implemented channel.

```
Domain operation
      ↓
same transaction: persist business state + NotificationOutbox PENDING
      ↓
commit
      ↓
in-process processor (awaited, failures swallowed)
      ↓
InAppNotificationChannel
      ↓
Notification row (User inbox)
```

Notifications are outputs. Creating or reading them does not emit further domain events.

## Module layout

```
src/modules/notifications/
├── types/            typed intents, events, enums
├── schemas/          Zod for trusted intents and action ids
├── errors.ts
├── copy.ts           user-facing title/body
├── deep-links.ts     entityType + entityId → route
├── adapters/         channel interface + in-app implementation
├── services/         recipients, outbox, processor, inbox queries, emit helper
├── actions/          read/unread/open (no create API)
├── ui/
├── tests/
└── ARCHITECTURE.md
```

There is no public `POST /api/notifications`. Clients cannot supply `recipientUserId`, `organizationId`, `title`, or `body`.

## Data model

### Notification

In-app inbox row. Delivered to `User`, never to `StaffProfile`.

| Field | Purpose |
| --- | --- |
| `organizationId` | tenant scope |
| `recipientUserId` | authenticated Rostera user |
| `type` | `NotificationType` enum |
| `title` / `body` | display copy |
| `entityType` / `entityId` | authoritative deep-link target |
| `eventId` | stable domain event identity |
| `readAt` | `null` = unread |

Hard delete is not provided. Notifications are operational history.

### NotificationOutbox

Durable notification intent, committed with the domain mutation.

| Field | Purpose |
| --- | --- |
| `eventType` + `eventId` | one outbox row per logical event |
| `payload` | JSON of resolved `NotificationIntent[]` |
| `status` | `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED` |
| `attempts` / `availableAt` / `lastError` | bounded retry metadata |

`lastError` is a generic delivery message. SQL, Prisma, and provider details are not stored.

## Notification types

```
LEAVE_REQUESTED
LEAVE_APPROVED
LEAVE_REJECTED
LEAVE_CANCELLED
SHIFT_SWAP_REQUESTED
SHIFT_SWAP_COMPLETED
SHIFT_SWAP_REJECTED
SHIFT_SWAP_CANCELLED
ROSTER_SUBMITTED_FOR_REVIEW
ROSTER_PUBLISHED
ROSTER_RETURNED_TO_DRAFT
```

Arbitrary client strings are rejected.

## Event IDs

Event identity is the domain row id. Retries reuse the same id.

| Event | `eventId` |
| --- | --- |
| Leave requested / approved / rejected / cancelled | `leaveRequest.id` |
| Shift swap requested / completed / rejected / cancelled | `shiftSwapRequest.id` |
| Roster submitted / published / returned to draft | `roster.id` |

Leave approval and leave request are different `type` values with the same `eventId`. That is intentional.

## Idempotency

Database uniqueness, not an application `if (!exists) create()` check.

- Outbox: unique `(organizationId, eventType, eventId)` as `notificationOutbox_event_key`
- Notification: unique `(organizationId, recipientUserId, type, eventId)` as `notification_idempotency_key`

A retry of approval cannot create a second `LEAVE_APPROVED` row for the same recipient. Concurrent processors that both insert hit `23505` and treat it as already delivered.

Prisma 8 cannot express a partial unique index here. These composites are full unique constraints and are sufficient for the event identity above.

## Transaction boundaries

Preferred and implemented:

```
db.transaction
  persist business state
  resolve recipients against that committed-to-be state
  insert NotificationOutbox PENDING (same transaction)
commit
await processOutboxEvent(...)   // after commit; errors swallowed
```

If the business transaction rolls back, the outbox row rolls back with it. A notification cannot exist for an uncommitted leave approval.

If in-app delivery fails after commit, the domain operation has already succeeded. The outbox remains `PENDING` (or `FAILED` after five attempts) for a future worker.

This processor is **in-process and awaited** so persistence does not depend on the browser remaining open. It is **not** a durable background worker. A crash after commit and before/during processing leaves a `PENDING` or `PROCESSING` outbox row. Do not treat `void processNotification()` as a queue; this code awaits processing and still relies on the outbox for recovery.

## Processing and retry

1. Load outbox by `(organizationId, eventType, eventId)`
2. Conditional update `PENDING` → `PROCESSING`
3. Deliver each intent through `InAppNotificationChannel`
4. `COMPLETED`, or on failure increment `attempts`

Retry: max **5** attempts. Failed attempts return to `PENDING` with `availableAt` delayed by `30 * attempts` seconds, except the fifth which is `FAILED`.

This phase has no cron/worker. Immediate processing runs once after the domain action. Later, a worker should select `status = PENDING AND availableAt <= now()`. `PROCESSING` rows left by a crash are a known limitation (no reclaim TTL yet).

Delivery is **not** guaranteed if the process dies after commit and no worker runs.

## Channels

```ts
interface NotificationChannel {
  deliver(notification: NotificationIntent): Promise<DeliveryResult>
}
```

Implemented: `InAppNotificationChannel`.

Prepared type aliases only (no providers): `EmailNotificationChannel`, `SmsNotificationChannel`, `WhatsAppNotificationChannel`.

Do not add Resend, Twilio, WhatsApp, FCM, or APNs in this phase.

## Recipient policy (MVP, smallest safe audience)

Recipients are resolved server-side. The actor is never notified of their own action. Unlinked staff (`StaffProfile.userId` null) and users without an `ACTIVE` membership produce no in-app row. SUPER_ADMIN is not notified merely because they hold all permissions.

| Event | Recipients |
| --- | --- |
| `LEAVE_REQUESTED` | Department head of the staff member's department, if linked; plus active members whose **role name** is `HR` |
| `LEAVE_APPROVED` / `LEAVE_REJECTED` / `LEAVE_CANCELLED` | Linked user of the affected staff member |
| `SHIFT_SWAP_REQUESTED` | Linked user of the nominated target staff |
| `SHIFT_SWAP_COMPLETED` | Linked users of requester and target staff |
| `SHIFT_SWAP_REJECTED` | Linked user of the requester |
| `SHIFT_SWAP_CANCELLED` | Linked user of the target staff |
| `ROSTER_SUBMITTED_FOR_REVIEW` | Department head of the roster's department, if linked; plus active members whose **role name** is `ROSTER_MANAGER` |
| `ROSTER_PUBLISHED` | Distinct assigned staff on that roster with linked users |
| `ROSTER_RETURNED_TO_DRAFT` | `roster.createdByUserId` if still an active member |

If nobody matches, the outbox is still written with an empty intent list and marked completed. Recipients are never taken from the browser.

## Read / unread

`readAt = null` at creation. Mark one read, mark one unread, mark all read. Every mutation uses `{ id, organizationId, recipientUserId }` from the active membership. A user cannot change another user's rows.

## Deep links

`entityType` + `entityId` are authoritative:

- `LEAVE_REQUEST` → `/leave/[id]`
- `SHIFT_SWAP` → `/shift-swaps/[id]`
- `ROSTER` → `/rosters/[id]`

The destination page still enforces authorization. A notification is not an access grant.

## Tenant isolation

Inbox queries always include `organizationId` and `recipientUserId` from `getCurrentMembership()`. The record is organization-scoped so a future multi-org user does not collapse inboxes by `userId` alone. The current active membership selects which org is shown. Client-supplied `organizationId` is ignored.

## Indexes

| Index | Why |
| --- | --- |
| `notification_idempotency_key` | prevent duplicate in-app rows |
| `notification_inbox_created_idx` `(organizationId, recipientUserId, createdAt)` | newest-first inbox |
| `notification_inbox_read_idx` `(organizationId, recipientUserId, readAt)` | unread lookups |
| `notificationOutbox_event_key` | one outbox row per event |
| `notification_organizationId_idx_*` / `notification_recipientUserId_idx_*` | Prisma relation indexes for FKs |
| `notificationOutbox_organizationId_idx_*` | Prisma relation index for the org FK |

RLS is enabled on both tables (`@@rls`). Application authorization still scopes every query; RLS does not replace it.

## Pagination

Page size 25. Prisma 8 equality `where` cannot push `createdAt < cursor` or SQL `LIMIT`. The service loads the recipient+organization rows, sorts by `createdAt` descending, and slices in memory. That is bounded per user, not a full-table scan, but it is not a database cursor. Documented for a later inequality/cursor query if the contract allows it.

Unread count is server-rendered from the same scoped load. No WebSockets, no SWR, no aggressive polling.

## UI

Dashboard header bell (desktop and the same staff header) shows unread count and recent items. `/notifications` lists the current user's notifications newest first, with unread state, timestamp, and open/mark-read actions.

## Known limitations

- In-process processing is not a job platform. Unprocessed outbox rows wait for a future worker.
- `PROCESSING` crash recovery is not implemented.
- Inbox pagination is in-memory after a recipient-scoped load.
- Email, SMS, WhatsApp, push, preferences, digests, and scheduling are out of scope.
- Recipient policy uses default role **names** (`HR`, `ROSTER_MANAGER`) plus department head, not a permission fan-out, to avoid notifying every SUPER_ADMIN.

## Phase 3K

Notifications stay an eventual outbox. Audit events are a separate transactional accountability record and must not be written through this processor. See [`audit/ARCHITECTURE.md`](../audit/ARCHITECTURE.md).
