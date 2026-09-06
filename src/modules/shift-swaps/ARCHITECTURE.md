# Shift swaps

Phase 3I adds a controlled two-assignment swap workflow. It does not generate assignments, match staff automatically, or amend published rosters.

```
ShiftAssignment A (Staff A)
        │
        │ request
        ▼
ShiftSwapRequest (PENDING)
        │
        │ approve
        ▼
load current org policy + approved leave
        │
simulate resulting assignments in memory
        │
Phase 3E detectConflicts
        │
transaction: exchange staffId + profession snapshot
        │
        ▼
COMPLETED
```

The scheduling engine stays pure. This module loads tenant data and calls `detectConflicts`. It does not add a second rules implementation.

## Domain

`ShiftSwapRequest` belongs to `Organization`. Source and target are existing `ShiftAssignment` rows on the **same roster**.

A swap exchanges the people assigned to two existing shifts. It does not create shifts, change shift type, date, time, roster, or department.

Client-supplied `organizationId`, `requesterStaffId`, `targetStaffId`, and identity fields are ignored. The authenticated membership and linked `StaffProfile` are authoritative.

## Lifecycle

Durable statuses:

```
PENDING → COMPLETED
PENDING → REJECTED
PENDING → CANCELLED
```

`APPROVED` exists on the enum for the domain language. Approval and assignment mutation happen in one transaction, so a successful approval is stored as `COMPLETED` with both `reviewedAt` and `completedAt`. A swap is never left `APPROVED` without exchanged assignments.

Invalid transitions (`COMPLETED → anything`, `REJECTED → APPROVED`, `APPROVED → REJECTED`) are rejected. Records are never hard-deleted.

## Authorization

Existing permissions: `shift_swap.view`, `shift_swap.request`, `shift_swap.approve`, `shift_swap.reject`.

| Actor | Request | View | Approve / reject | Cancel |
| --- | --- | --- | --- | --- |
| STAFF (self-service) | Own assignment only | Own as requester or target | No | Own `PENDING` |
| DEPARTMENT_HEAD / SUPER_ADMIN | No (except SUPER_ADMIN via all permissions) | Org | Yes | No |
| ROSTER_MANAGER / SUPERVISOR / HR | No | Org | No | No |

Self-service is `shift_swap.request` without `shift_swap.approve`. Unlinked STAFF receives `STAFF_NOT_LINKED`.

HR received `shift_swap.view` in this phase so the default role matches the product table. `ensureDefaultRoleGrants` backfills existing orgs.

## Same-roster and department

Both assignments must share `rosterId` and `departmentId` from trusted database rows. Cross-roster swaps are rejected (`SWAP_ROSTER_MISMATCH`).

## Published roster behavior

Requests may be created against any roster status.

Completion is **DRAFT only**.

| Roster status | Request | Complete |
| --- | --- | --- |
| DRAFT | Yes | Yes |
| IN_REVIEW | Yes | No (`SWAP_REQUIRES_DRAFT_ROSTER`) |
| PUBLISHED | Yes | No (`SWAP_REQUIRES_AMENDMENT`) |
| AMENDED | Yes | No (`SWAP_REQUIRES_DRAFT_ROSTER`) |

Published assignments are never mutated. Amendments/versioning are not implemented.

## Validation flow

Create and approve both simulate the resulting schedule before writing assignments.

1. Resolve membership and linked staff
2. Load source and target assignments in the organization
3. Confirm ownership, same roster, same department, active staff, distinct people
4. Reject if either assignment is in another `PENDING` swap
5. Load current organization scheduling policy (Phase 3G)
6. Load approved leave for both staff members (Phase 3H)
7. Build an in-memory assignment list with staff ids swapped
8. Call `detectConflicts`
9. Blocking conflicts for those two staff members → `SWAP_SCHEDULING_CONFLICT`

The database is not temporarily mutated to test validity.

Approve repeats this inside `db.transaction` against current rows. UI validation is never trusted.

## Scheduling integration

`simulateSwapAssignments` builds `SchedulingContext` with:

- both staff members
- all of their organization assignments, with the two swap rows reassigned
- original assignment `professionId` snapshots (qualification target)
- `schedulingConfigForOrganization`
- `loadApprovedLeaveForStaffIds`

Then `detectConflicts` with the default Phase 3E rules. No Prisma, Supabase, or Next.js inside the engine.

## Assignment mutation semantics

On success, only these assignment columns change:

- `staffId` → the other staff member
- `professionId` → that staff member's current profession (staff-derived snapshot)

Unchanged: `shiftTypeId`, `date`, `shiftStartTime`, `shiftEndTime`, `isOvernight`, `startDateTime`, `endDateTime`, `departmentId`, `rosterId`.

Qualification is evaluated against the **original** profession snapshot. Incoming staff must match it. After a successful swap the snapshot is rewritten to the new staff member's profession, which is the same value when qualification passed.

## Concurrency

Inside the approval transaction, updates are conditional:

- swap `status = PENDING`
- source `staffId = requesterStaffId`
- target `staffId = targetStaffId`
- both still on the same roster

A miss is `SWAP_STATE_CHANGED`.

Pending uniqueness is enforced in the service by loading `PENDING` swaps that mention either assignment. Prisma 8 equality `where` cannot express a partial unique index covering “assignment is source or target while PENDING”. Concurrent creates can therefore race. Documented; do not claim database-level exclusion for active swaps.

Sequential staff updates can hit `shiftAssignment_combo_key` or `shiftAssignment_staff_time_excl` for two assignments that share roster, date, and shift type (or overlapping windows) because PostgreSQL unique/exclusion checks are immediate. That intermediate state is mapped to `SWAP_SCHEDULING_CONFLICT` and rolled back. Typical different-day swaps do not hit it.

GiST `shiftAssignment_staff_time_excl` is unchanged.

## Audit

Swap request/complete/reject/cancel persist `AuditEvent` rows in the same transaction as the swap write. Completed swaps are represented as `SHIFT_SWAP_COMPLETED` (including both assignment ids) rather than extra `ASSIGNMENT_*` events. Audit failure rolls back the swap. See [`audit/ARCHITECTURE.md`](../audit/ARCHITECTURE.md).

[`shiftSwapAuditPoint`](services/audit.ts) remains a no-op compatibility hook from Phase 3I.

## Notifications

Create, complete, reject, and cancel enqueue `SHIFT_SWAP_*` outbox events in the same transaction as the swap write. `SHIFT_SWAP_COMPLETED` is only enqueued after the assignment exchange commits. See [`notifications/ARCHITECTURE.md`](../notifications/ARCHITECTURE.md).

## Known limitations / follow-up

- No roster amendments, so published swaps cannot complete.
- No cross-roster, partial, or multi-shift swaps.
- No DB-level unique for “assignment in at most one PENDING swap”.
- Immediate unique/exclusion checks make identical-slot swaps fail at mutation even when the simulated end state is valid.
- Policy is loaded live, not snapshotted onto the swap row.

## Before Phase 3J

Review published-roster amendment design before allowing completed swaps on `PUBLISHED`. Review whether unique/exclusion constraints should be `DEFERRABLE` for identical-slot exchanges. Review whether pending-swap uniqueness needs a lock table.
