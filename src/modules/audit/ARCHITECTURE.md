# Audit trail

Phase 3K adds a tenant-scoped, append-only accountability record for important state-changing operations.

```
Domain mutation
      ↓
same transaction: persist business state + AuditEvent
      ↓
commit  (or rollback both)
```

This is not an application event bus. It is not a notification channel.

```
Notifications = eventual side effect / outbox
Audit         = transactional accountability record
```

If the audit insert fails, the business transaction fails and rolls back. Audit writes are never `void`, never after-commit, and never processed by the notification worker.

## Module layout

```
src/modules/audit/
├── types/            actions, entity types, actor union
├── schemas/          list filters and id input
├── services/         recordAuditEvent, list/get
├── ui/               viewer table, filters, detail
├── sanitize.ts       defensive redaction
├── copy.ts           quoted names for summaries
├── deep-links.ts     informational routes only
├── errors.ts
└── ARCHITECTURE.md
```

There is no public create/update/delete API for audit records. Server components read through `listAuditEvents` / `getAuditEvent` after `audit.view`. Callers cannot supply `organizationId` or actor identity from the browser.

## Data model

`AuditEvent` is append-only (no `updatedAt`).

| Field | Purpose |
| --- | --- |
| `organizationId` | tenant scope; always from the trusted actor |
| `actorType` | `USER` or `SYSTEM` |
| `actorUserId` / `actorMembershipId` | set for USER actors; null for SYSTEM |
| `action` | stable `AuditAction` enum |
| `entityType` / `entityId` | affected record; informational only |
| `eventId` | tenant-unique event identity |
| `summary` | human-readable sentence from the domain layer |
| `metadata` | JSON string of concise before/after; sanitized |
| `requestId` / `ipAddress` / `userAgent` | optional; currently unused |
| `createdAt` | when the transaction recorded the event |

## Actor resolution

Interactive operations use `recordUserAudit(tx, membership, …)`. Membership comes from `getCurrentMembership()` (Supabase auth user → Rostera User → active OrganizationMember). Form fields named `organizationId` or `actorUserId` are ignored.

`SYSTEM` exists for future scheduled jobs. Do not fabricate a User row.

## Tenant isolation

Every insert stores `actor.organizationId`. Every viewer query adds `organizationId` from the active membership. Client-supplied organization IDs are not accepted.

## Action taxonomy

Wired today:

- Rosters: create, update, submit for review, return to draft, publish, amendment created, delete
- Assignments: create, delete (no assignment update operation exists)
- Leave: create, approve, reject, cancel
- Shift swaps: request, complete, reject, cancel
- Staff: create, update, deactivate; department head assign/remove
- Departments: create, update, delete
- Organization professions: create, update, deactivate (global professions stay read-only)
- Shift types: create, update, deactivate
- Staffing requirements: create, update, delete
- Scheduling policy: update

Present in the enum but **not wired** because the workflows do not exist:

```
USER_INVITED
USER_UPDATED
USER_DEACTIVATED
MEMBERSHIP_ROLE_CHANGED
MEMBERSHIP_ACTIVATED
MEMBERSHIP_DEACTIVATED
```

Shift-swap completion is the accountability event for the assignment exchange. Completing a swap does not also emit `ASSIGNMENT_*`.

Read/list/GET operations do not write audit rows, including viewing `/audit`.

## Metadata and redaction

Do not serialize entire rows or request bodies. Typical payload:

```ts
{
  changedFields: ["status"],
  before: { status: "DRAFT" },
  after: { status: "IN_REVIEW" }
}
```

`sanitizeAuditMetadata` replaces sensitive keys (`password`, `token`, `secret`, `authorization`, `cookie`, `otp`, `refreshToken`, `accessToken`, `apiKey`, `session`, …) with `[redacted]` at any nesting level.

Staff audit metadata stores names, staff number, department, profession, and employment fields. Phone, email, and photo URLs are omitted.

## Transaction coupling

Domain services call `recordUserAudit` inside `db.transaction`. Failure semantics:

```
business mutation + audit success → commit
business mutation + audit failure → rollback
```

Notifications remain an after-commit outbox. An audit failure must not be swallowed as a notification failure would be.

Default scheduling-policy provisioning (`ensureDefaultSchedulingPolicy`) is not a user action and is not audited. Only `updateSchedulingPolicy` is.

Cascade deletes of assignments while deleting a draft roster are covered by `ROSTER_DELETED`, not per-assignment events.

## Idempotency

Unique `(organizationId, eventId)`.

- One-shot actions (create, publish, delete, leave approve/reject/cancel, swap request/complete/reject/cancel, staff create/deactivate, …) use `${action}:${entityId}`.
- Repeatable actions (updates, submit-for-review after return-to-draft, head assign/remove) use `${action}:${entityId}:${uuid}`.

A retry of the same one-shot identity hits unique constraint `23505` and does not insert a second row. Two genuine user updates remain two events. Unique violations are not swallowed.

## Append-only enforcement

Application code exposes insert and retrieval only. There is no `updateAuditEvent` / `deleteAuditEvent`, and no UI to edit or delete rows.

Database: `@@rls` enables row-level security with no authenticated insert/update/delete policies. The app uses a privileged server-side connection, so RLS is a complementary control against the Supabase client, not a replacement for application authorization.

No immutability trigger was added, to avoid fighting the Prisma 8 contract/migration pipeline.

## Authorization

Viewer access uses the existing permission `audit.view`.

Default grants:

- `SUPER_ADMIN` (all permissions)
- `ROSTER_MANAGER`
- `HR`

`STAFF`, `SUPERVISOR`, and `DEPARTMENT_HEAD` are not granted organization-wide audit access. `ensureDefaultRoleGrants` backfills missing default grants without removing extra grants an organization already configured.

Destination pages linked from an audit event enforce their own authorization. `entityType` / `entityId` are not an access grant.

## Pagination

Page size 25. Prisma 8 equality `where` cannot push `createdAt < cursor` or SQL `LIMIT`. The service loads organization-scoped rows, applies date/search filters in memory, sorts by `createdAt` descending, and slices. That is tenant-bounded, not a database cursor.

Equality filters (`action`, `entityType`, `actorUserId`, `entityId`) are pushed to `where`. Date range and summary search are in-memory.

## Request metadata

`requestId`, `ipAddress`, and `userAgent` are nullable columns. Rostera has no request/correlation-id infrastructure. Callers must not invent IDs. Optional request metadata must never block a business write.

## UI

`/audit` is in the dashboard nav only when the active membership has `audit.view`. The list shows timestamp (organization timezone), actor, action, and summary. The detail page renders before/after fields structurally, not as a raw JSON blob.

## Known limitations

- Pagination is in-memory after an organization-scoped load.
- Optional request metadata is unused until a correlation-id layer exists.
- Privileged DB role can still UPDATE/DELETE `auditEvent` at SQL level; application and RLS are the current controls.
- User/membership invite and role-change workflows are not implemented, so those enum values are unused.
- Prisma 8 cannot express inequality/cursor pagination in the contract query API used here.

## Future considerations

- A later worker should not write audit events after commit.
- Security/authentication events belong in a dedicated security audit layer, not this operational trail.
- If the Prisma 8 contract gains inequality/`LIMIT`, replace in-memory paging with a real cursor.
- User invite / membership mutations should call `recordUserAudit` when those services exist.
