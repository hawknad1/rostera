# Roster lifecycle and versioning

Phase 3F added review and publishing on top of Phase 3D rosters and the Phase 3E scheduling engine. Phase 3L adds roster series/versioning so a published roster can be amended without mutating history.

```
Roster Series
    │
    ├── V1 ── PUBLISHED
    │
    └── V2 ── DRAFT
             │
             ├── edit
             ├── validate
             ├── review
             └── publish
```

After the amendment is published:

```
Roster Series
    │
    ├── V1 ── PUBLISHED (historical)
    │
    └── V2 ── PUBLISHED (current)
```

## Versioning model

There is no separate `RosterSeries` table. Each `Roster` row is one version:

| Field | Meaning |
| --- | --- |
| `seriesId` | stable series identity (new UUID on the original roster) |
| `versionNumber` | integer `>= 1`; unique with `(organizationId, seriesId)` |
| `parentRosterId` | the published version this amendment was copied from |
| `amendmentReason` | required on versions `> 1`; null on the original |

Version 1 is the original roster. It may move `DRAFT → IN_REVIEW → PUBLISHED`. An amendment of the **current published** version creates version N+1 as a new `DRAFT` with copied assignments. The client cannot supply `organizationId`, `createdByUserId`, `seriesId`, `versionNumber`, or `parentRosterId`.

`AMENDED` remains on the Prisma enum for compatibility. It is not an operational status. Versions keep using `DRAFT`, `IN_REVIEW`, and `PUBLISHED`.

## Current-version semantics

The current published version of a series is the row with the highest `versionNumber` among `PUBLISHED` rows in that series. This is computed in services, never by the UI.

While a draft amendment exists, the previous published version stays current. There is never a gap where the series has no published roster because an amendment is being edited.

Operational list views show **one row per series**: the unpublished amendment if one exists, otherwise the current published version, otherwise the latest draft.

## Assignment copying

Copied assignments are **new rows** with new ids. Snapshot fields are copied as they existed on the source version:

- `staffId`, `shiftTypeId`, `professionId`, `departmentId`
- `date`, `shiftStartTime`, `shiftEndTime`, `isOvernight`
- `startDateTime`, `endDateTime`
- `copiedFromAssignmentId` → source assignment id

The copy does not refresh profession or shift configuration from current staff/shift-type rows. After the new version is `DRAFT`, normal assignment create/delete applies.

## Overlap constraint

Historical versions keep the same staff time windows, so an organization-wide GiST exclusion cannot coexist with immutable copies.

The live exclusion is roster-scoped:

```
(staffId, rosterId, tstzrange(start, end, '[)'))
```

Cross-roster overlap (including other series) is enforced by the scheduling engine. Validation and assignment create ignore other versions in the **same series**, and ignore historical (non-current) published versions of other series.

## Lifecycle

Operational statuses:

```
DRAFT → IN_REVIEW → PUBLISHED
         ↓
       DRAFT
```

There is no `DRAFT → PUBLISHED` shortcut. Amendments use this same path.

| From | To | Permission | Extra check |
| --- | --- | --- | --- |
| DRAFT | IN_REVIEW | `roster.review` | Fresh `validateRoster`; blockers reject |
| IN_REVIEW | DRAFT | `roster.review` | None |
| IN_REVIEW | PUBLISHED | `roster.publish` | Fresh validation; for version `> 1`, parent must still be the current published version |
| PUBLISHED | anything | — | `ROSTER_ALREADY_PUBLISHED` |

## Amendment creation

`createRosterAmendment` requires `roster.amend`. Default grants: `SUPER_ADMIN`, `ROSTER_MANAGER`. `DEPARTMENT_HEAD` can edit/review drafts but cannot amend or publish.

Rules:

1. Source must be `PUBLISHED`
2. Source must be the current published version of its series
3. At most one unpublished (`DRAFT` / `IN_REVIEW`) amendment per series (`AMENDMENT_ALREADY_EXISTS`)
4. Reason is required, trimmed, max 280 characters
5. Next `versionNumber` is `max(existing)+1`
6. Audit `ROSTER_AMENDMENT_CREATED` and notification outbox run in the same transaction as the insert

Prisma 8 cannot express a partial unique “one unpublished per series”. Protection is the service re-check plus unique `(organizationId, seriesId, versionNumber)`. Two concurrent creates of version N collide on that unique key; the loser is mapped to `AMENDMENT_ALREADY_EXISTS`. Residual race: a second unpublished row with a **different** version number if both pass the unpublished check before either inserts. MVP does not add advisory locks.

## Publishing an amendment

Publishing version N does **not** mutate version N-1. The previous published row stays `PUBLISHED` and historical. The new row becomes current because it has the higher version number.

Stale publish: if the amendment’s parent is no longer the current published version, publish fails with `NOT_CURRENT_PUBLISHED_VERSION`. Publishing the same amendment twice is `ROSTER_ALREADY_PUBLISHED` via the conditional `IN_REVIEW` update.

## Comparison

Server-side, read-only, previous version only. Assignment identity does not use the new row id.

Pairing order:

1. `copiedFromAssignmentId` lineage
2. exact `date + shiftTypeId + staffId`
3. same `date + shiftTypeId` (staff replacement on a slot)
4. same `date + staffId` (shift/time change)

Unpaired current rows are added. Unpaired previous rows are removed. In-place assignment update does not exist, so delete+create often appears as removed+added unless lineage or slot matching still pairs them.

## Deletion

Draft amendments may be deleted with the existing draft-only rule. Deleting version N must not touch the source version, its assignments, or its audit history. `ROSTER_DELETED` metadata includes `versionNumber` and `seriesId`.

## Notifications

`ROSTER_AMENDMENT_CREATED` notifies the department head and other roster managers (same audience as submit-for-review), excluding the actor. Copied assignments do not emit per-row notifications.

Publishing an amendment reuses `ROSTER_PUBLISHED` against the **new** roster id (assigned linked staff on that version). Event identity is the roster row id, so v1 and v2 publishes are distinct.

## Shift swaps and leave

Published assignments still cannot be swapped (`SWAP_REQUIRES_AMENDMENT`). Swaps do not auto-create amendments. Approved leave still never rewrites published assignments; the operational path is to amend, edit the draft, validate, and publish.

## Reporting implications

Do not sum assignments across versions of the same series. Future reports must filter to the current published version (or a chosen historical version), never every `PUBLISHED` row in the series.

## Concurrency

| Risk | Protection |
| --- | --- |
| Two amendments from the same published version | Unpublished check + unique `(seriesId, versionNumber)` |
| Two publishes of the same amendment | Conditional `where({ status: "IN_REVIEW" })` |
| Publish after another version became current | Parent must still be current published |
| Edit during publish | Assignments cannot change while `IN_REVIEW`; Prisma 8 has no `SELECT FOR UPDATE` |

## Known limitations

- No partial unique constraint for “one unpublished per series”.
- Roster-scoped overlap exclusion: engine enforces cross-roster overlap; a raw SQL insert can bypass it.
- `copiedFromAssignmentId` is lineage, not a foreign key, so comparison can fall back to slot matching.
- No `publishedAt` column; version history uses `updatedAt` for published rows and `createdAt` for drafts.
- `AMENDED` enum value is unused.

## Audit

Roster create/update/submit/return/publish/amend/delete persist `AuditEvent` rows in the same transaction. Assignment create/delete do the same. Audit failure rolls back the business change. See [`audit/ARCHITECTURE.md`](../audit/ARCHITECTURE.md).

Amendment metadata: `sourceRosterId`, `sourceVersion`, `newVersion`, `reason`. Publish metadata includes `version` and `previousVersion`. Full roster snapshots are not stored.

## Validation

[`validateRoster`](services/validation.ts) is tenant-scoped. It loads current rows and the current organization scheduling policy, builds a `SchedulingContext`, and calls [`detectConflicts`](../scheduling/engine/detectConflicts.ts). Same-series sibling versions are excluded from overlap. Historical published versions of other series are excluded; their current published version is included.

Staffing shortfall is a WARNING. Overstaffing is INFO. `valid` means zero blocking conflicts.
