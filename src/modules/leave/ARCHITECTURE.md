# Leave management

Phase 3H adds an organization-scoped leave domain and feeds **approved** leave into the existing Phase 3E scheduling engine. It is not an HR/payroll system.

```
Organization
   │
   ├── StaffProfile
   │      └── LeaveRequest
   │
   └── Rosters → Assignments
                      │
                      ▼
               SchedulingContext
                 ├── scheduling policy
                 └── approved leave
                      │
                      ▼
               Pure scheduling engine
                      │
                      ▼
               SchedulingConflict[]
```

## Domain

`LeaveRequest` belongs to `Organization` and `StaffProfile`, not to `User`.

Staff may exist without a Rostera login. HR and department heads can create leave on behalf of a staff member. `StaffProfile.userId` may be null.

Leave is a calendar-date range `[startDate, endDate]` inclusive, stored as `YYYY-MM-DD` strings. Duration is calendar days (`10–12 September` = 3 days). JavaScript `Date` and millisecond math are not used.

## Lifecycle

```
PENDING → APPROVED
PENDING → REJECTED
PENDING → CANCELLED
APPROVED → CANCELLED
```

Invalid transitions (`APPROVED → REJECTED`, `APPROVED → APPROVED`, `REJECTED → APPROVED`) are rejected. Reopening rejected leave requires a new request.

Records are never hard-deleted.

## Leave types

Controlled enum: `ANNUAL`, `SICK`, `MATERNITY`, `PATERNITY`, `STUDY`, `COMPASSIONATE`, `OTHER`.

These are operational categories only. They are not Ghanaian statutory leave types. Organization-configurable types and accrual/balances are deferred.

## Authorization

Existing permissions: `leave.view`, `leave.create`, `leave.approve`, `leave.reject`.

| Actor | Create | View | Approve / reject | Cancel |
| --- | --- | --- | --- | --- |
| STAFF (self-service) | Own `StaffProfile` only | Own leave only | No | Own `PENDING` |
| HR / DEPARTMENT_HEAD / SUPER_ADMIN | Any staff in the org | All org leave | Yes | `PENDING` or `APPROVED` |
| SUPERVISOR / ROSTER_MANAGER | No | All org leave | No | No |

Self-service is derived server-side: `leave.create` without `leave.approve`. The client cannot supply `isSelf` or another `staffId` to bypass this.

A STAFF user with no linked `StaffProfile` receives `STAFF_NOT_LINKED`. Leave creation never auto-creates staff records.

Phase 3H granted `leave.create` to **HR** and **DEPARTMENT_HEAD**. Previously only STAFF and SUPER_ADMIN had it, which blocked creating leave on behalf of staff.

## Inactive staff

Only `employmentStatus === ACTIVE` staff can receive new leave. Pending leave for a staff member who later becomes inactive cannot be approved (`STAFF_NOT_ACTIVE`). History is kept. Leave is not deleted on termination.

## Overlap

Active statuses: `PENDING`, `APPROVED`.

Overlap is date-range overlap:

`existing.startDate <= new.endDate AND existing.endDate >= new.startDate`

Adjacent ranges are allowed (`10–12` then `13–15`). Rejected and cancelled leave do not block.

Enforced in the leave service inside a transaction. The in-memory test ORM also rejects overlapping active leave.

A PostgreSQL gist exclusion on text `YYYY-MM-DD` columns is not practical here: `daterange(startDate::date, endDate::date)` is not `IMMUTABLE`, and Prisma 8's contract does not express exclusion constraints. Concurrent overlapping creates can therefore race. The service check plus transaction is the guaranteed path; do not claim database-level overlap safety.

## Scheduling integration

The engine stays pure. The service layer loads tenant-scoped approved leave and passes `SchedulingLeavePeriod[]` into `SchedulingContext.leavePeriods`.

`SchedulingLeavePeriod` uses calendar dates (`startDate` / `endDate`), not Instant windows. Phase 3E Instant overlap was replaced so overnight shifts follow assignment-date semantics.

The existing `leaveConflict` rule still evaluates `SchedulingContext`. Only `APPROVED` leave emits `LEAVE_CONFLICT` (HARD / blocking). PENDING, REJECTED, and CANCELLED do not.

Assignment create loads approved leave for that staff member and assignment date.

Roster validation / submit / publish load approved leave for roster staff whose periods overlap the roster date range. Clients cannot supply leave state on those APIs.

### Overnight assignment semantics

Leave is compared to `assignment.date`, not the Instant window.

- Leave on 10 September conflicts with a night shift **dated** 10 September (`22:00 → 11 September 06:00`).
- A night shift **dated** 9 September that ends on 10 September does **not** conflict with leave on 10 September solely because it ends that morning.

## Existing assignments and published rosters

Approving leave does **not** delete or edit assignments.

- DRAFT / IN_REVIEW: validation reports `LEAVE_CONFLICT`; the manager can change the assignment.
- PUBLISHED: the roster stays immutable. Leave approval/cancellation never rewrites published assignments or status. Operational amendment/versioning is deferred (Phase 3L-style).

## Audit

[`leaveAuditPoint`](services/audit.ts) is called for `LEAVE_REQUESTED`, `LEAVE_APPROVED`, `LEAVE_REJECTED`, and `LEAVE_CANCELLED`. It does not persist. Payload: `organizationId`, `leaveId`, `staffId`, `actorUserId`, `previousStatus`, `newStatus`, `occurredAt`.

## Tenant isolation

Every query uses `{ id, organizationId }` (or equivalent). Cross-tenant ids return `LEAVE_NOT_FOUND`.

## Phase 3I

Shift swaps load approved leave for both staff members via [`loadApprovedLeaveForStaffIds`](services/scheduling-leave.ts) and pass it into `SchedulingContext.leavePeriods`. See [`shift-swaps/ARCHITECTURE.md`](../shift-swaps/ARCHITECTURE.md).

## Follow-up

- Concurrent overlapping leave can race; a Postgres gist exclusion was not added because text date columns cannot use an IMMUTABLE `daterange` expression in this Prisma 8 contract.
- Approving leave never removes existing assignments, including published ones. Operational repair belongs in a later amendment/versioning workflow.
- HR/department-head created leave still starts `PENDING` and must be approved before it blocks scheduling.
- Leave types are a fixed enum, not organization-configurable.
- `leave.create` was granted to HR and DEPARTMENT_HEAD so they can create leave on behalf of staff. `ensureDefaultRoleGrants` backfills existing orgs.
