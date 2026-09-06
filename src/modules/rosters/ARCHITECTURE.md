# Roster lifecycle

Phase 3F adds review and publishing on top of Phase 3D rosters and the Phase 3E scheduling engine. It does **not** generate assignments or version published rosters.

Phase 3G persists organization scheduling policy and feeds it into this validation path. Policy is loaded for the authenticated organization before `detectConflicts`. It is not stored on roster or assignment rows.

## Lifecycle

Operational statuses:

```
DRAFT → IN_REVIEW → PUBLISHED
         ↓
       DRAFT
```

`AMENDED` exists on the Prisma enum and must not be removed. It is not operational in this phase.

There is no `DRAFT → PUBLISHED` shortcut. `DEPARTMENT_HEAD` can review but cannot publish; skipping `IN_REVIEW` would collapse that review boundary.

## Transition rules

Enforced only in roster services. The client cannot choose an arbitrary next status.

| From | To | Permission | Extra check |
| --- | --- | --- | --- |
| DRAFT | IN_REVIEW | `roster.review` | Fresh `validateRoster`; blockers reject |
| IN_REVIEW | DRAFT | `roster.review` | None |
| IN_REVIEW | PUBLISHED | `roster.publish` | Fresh `validateRoster` inside the same transaction; blockers reject |
| PUBLISHED | anything | — | `ROSTER_ALREADY_PUBLISHED` |

Conditional `where({ id, organizationId, status })` updates prevent a concurrent status change from being overwritten.

## Validation

[`validateRoster`](services/validation.ts) is tenant-scoped. It loads current rows and the current organization scheduling policy, builds a `SchedulingContext`, and calls [`detectConflicts`](../scheduling/engine/detectConflicts.ts). It does not reimplement rules.

Configurable rest, weekly hours, consecutive days, night limits, and weekend limits run when the organization policy has a non-null threshold. `null` disables that rule. Always-on: overlap, qualification, approved leave (empty input today), staffing evaluation.

A policy change is picked up on the next validate, submit, or publish. It does not mutate a published roster.

Staffing shortfall is a WARNING (`blocking: false`). Overstaffing is INFO. They never prevent review or publish.

`valid` means zero blocking conflicts.

## Publish safeguards

`publishRoster`:

1. Authenticate and resolve ACTIVE membership
2. Require `roster.publish`
3. Load the roster with `{ id, organizationId }`
4. Require current status `IN_REVIEW`
5. Re-run validation against **current** database rows inside `db.transaction`
6. Update only `where({ id, organizationId, status: "IN_REVIEW" })`

A client-supplied validation result is never accepted. Stale UI validation cannot publish a roster that now has blockers.

Prisma 8 equality `where` has no `SELECT FOR UPDATE`. Residual race: IN_REVIEW → DRAFT → edit → IN_REVIEW during the same publish transaction. Assignments cannot change while the roster remains IN_REVIEW. Documented for a later locking/version column if needed.

## Published immutability

Once `PUBLISHED`:

- Assignment create/delete still require DRAFT (`ROSTER_NOT_DRAFT`)
- Roster metadata updates require DRAFT
- Status changes are rejected (`ROSTER_ALREADY_PUBLISHED`)
- `deleteRoster` is rejected (`ROSTER_ALREADY_PUBLISHED`)

`deleteRoster` is DRAFT-only. IN_REVIEW must return to draft first.

UI button visibility is not the security boundary.

## Amendments

Versioning, cloning, and amending a published roster are deferred. This phase only establishes the immutable published boundary.

## Audit

[`rosterStatusChangeAuditPoint`](services/audit.ts) is called after a successful status change with `rosterId`, `organizationId`, `actorUserId`, `previousStatus`, `newStatus`, and `occurredAt`. It does not persist. A future audit module should record that payload.
