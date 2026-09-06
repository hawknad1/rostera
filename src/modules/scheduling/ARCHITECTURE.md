# Scheduling engine

Phase 3E adds a pure rules layer that answers two questions:

1. Is this assignment valid?
2. What scheduling conflicts exist in this roster?

It does **not** generate, rank, or optimize assignments.

Phase 3G adds an organization-scoped scheduling policy. The engine stays pure. The database stores policy. The service layer loads and normalizes it into `SchedulingContext.config`.

```
OrganizationSchedulingPolicy  (Postgres)
        ↓  load + normalize
SchedulingContext.config
        ↓
Pure scheduling engine
        ↓
SchedulingConflict[]
```

The engine never queries Prisma, Supabase, Next.js, cookies, membership, or environment variables. It does not know the policy came from Postgres.

## Layers

**Service / application**

- [`src/modules/organizations/services/ensure-scheduling-policy.ts`](../organizations/services/ensure-scheduling-policy.ts) — idempotent default policy
- [`src/modules/organizations/services/scheduling-policy.ts`](../organizations/services/scheduling-policy.ts) — authenticated get/update; `settings.view` / `settings.edit`
- [`src/modules/rosters/services/assignments.ts`](../rosters/services/assignments.ts) — loads current org policy, then `validateAssignment`
- [`src/modules/rosters/services/validation.ts`](../rosters/services/validation.ts) — loads current org policy, then `detectConflicts`

**Engine** (`src/modules/scheduling/`)

- Plain TypeScript domain objects only
- No Next.js, React, Prisma, Supabase, cookies, or server actions
- Deterministic, side-effect free rules

## Organization scheduling policy

One row per organization: `OrganizationSchedulingPolicy` with a unique `organizationId`.

| Field | Disabled | Enabled meaning |
| --- | --- | --- |
| `minimumRestMinutes` | `null` | Positive whole minutes of rest required between consecutive assignment Instants |
| `maximumWeeklyMinutes` | `null` | Positive whole minutes allowed in an ISO week |
| `maximumConsecutiveDays` | `null` | Positive whole calendar days in a consecutive run |
| `maximumNightShiftsPerWeek` | `null` | Non-negative overnight assignments per ISO week (`0` means none allowed) |
| `maximumWeekendShifts` | `null` | Non-negative Saturday/Sunday assignments per ISO week (`0` means none allowed) |

`null` means the rule is **disabled**. A configured integer means the rule is **enabled**. A conflict is emitted only when the enabled threshold is violated.

Do not use `0` as a disabled sentinel for rest, weekly minutes, or consecutive days. Zero is a valid enabled threshold only for night and weekend counts.

New organizations receive an explicit all-`null` row. Missing rows are backfilled by `ensureDefaultSchedulingPolicy`, which is idempotent and relies on the unique constraint if two creates race.

The client cannot supply policy on assignment or roster APIs. Policy is always loaded for the authenticated membership's organization.

Policy is **not** snapshotted onto assignments or rosters. Changing policy can make an existing DRAFT or IN_REVIEW roster invalid on the next validation. That is intended. Published rosters remain immutable; policy changes do not rewrite them.

Future policy versioning (historical reproducibility of “what rule set was in force when this roster was published”) is deferred. Do not add it until there is a concrete product requirement.

## Enabled / disabled / conflict

Rules resolve config through [`resolveSchedulingPolicy`](policy/resolve.ts):

- `undefined` and `null` → disabled
- `number` (including `0` where allowed) → enabled
- enabled + within threshold → pass
- enabled + above threshold → conflict

Persisted org policy maps through [`toSchedulingConfig`](policy/to-scheduling-config.ts). Enabled night and weekend limits from org policy are **HARD** (they block assignment create and roster publish). Nested `nightShiftLimit` / `weekendLimit` with an explicit `constraint` remain available for engine tests and still choose HARD or SOFT.

Always-on non-policy rules: overlap, qualification, approved leave (loaded by the service layer from `LeaveRequest`), staffing evaluation.

## Default policy

All configurable constraints disabled. Coverage calculation remains active. Phase 3E hard constraints that do not read policy continue to operate.

## Calendar and timezone semantics

Rostera uses organization-local calendar dates (`YYYY-MM-DD`) plus Instant windows derived with the organization's IANA timezone.

- **Week:** ISO week, Monday–Sunday, from `isoWeekBounds(assignment.date)`. Grouping uses the assignment date string, not the server timezone and not `Date.getDay()`.
- **Working hours:** Instant duration of each assignment whose `date` falls in that ISO week. An overnight shift is not split across weeks; its full duration counts on its assignment date.
- **Consecutive days:** unique assignment dates. An overnight shift counts as one day — the assignment date — not the following calendar day it ends on.
- **Night shifts:** `assignment.isOvernight` from the shift type. Clock time is not inferred.
- **Weekend:** Saturday and Sunday (`Temporal.PlainDate.dayOfWeek` 6 and 7). No public-holiday calendar.
- **Leave:** inclusive calendar dates compared to `assignment.date`. An overnight shift is judged by its assignment date, not the morning it ends.

The engine does not hardcode `Africa/Accra`. Organization timezone already exists on `Organization.timezone` and is passed in as `SchedulingContext.timeZone`. Per-user or per-department timezones are out of scope.

## Rule interface

```ts
interface SchedulingRule {
  readonly id: string
  readonly constraint: "HARD" | "SOFT"
  evaluate(context: SchedulingContext): SchedulingConflict[]
}
```

## Hard vs soft

| Kind | Typical severity | `blocking` | Assignment create |
| --- | --- | --- | --- |
| HARD | ERROR / CRITICAL | true | Rejected (`valid === false`) |
| SOFT | WARNING / INFO | false | Allowed; returned as warnings |

Staffing shortfall is always a WARNING and never rejects a manual assignment.

## SchedulingContext

Plain data: organization id and timezone, roster period, staff, assignments (Instant windows), staffing requirements, leave periods, config, optional `focus` for candidate validation.

The loader filters every row to a single `organizationId`. The engine does not perform authorization.

Leave is a domain input (`PENDING | APPROVED | REJECTED | CANCELLED`) with inclusive calendar dates (`startDate` / `endDate` as `YYYY-MM-DD`). Only `APPROVED` leave is a constraint. The engine compares leave to `assignment.date`, not Instant windows, so overnight shifts are judged by their assignment date. The service layer loads tenant-scoped approved leave from `LeaveRequest` into `SchedulingContext.leavePeriods`. PENDING leave does not block scheduling. See [`leave/ARCHITECTURE.md`](../leave/ARCHITECTURE.md).

## SchedulingConflict

Stable `code`, `severity`, `blocking`, `rule`, presentation `message`, and optional ids/metadata. UI should key off `code` and `severity`, not message text.

Conflict sort: CRITICAL → ERROR → WARNING → INFO, then date, staffId, rule, code.

## Validation vs evaluation

- `validateAssignment(context, candidate)` copies context (does not mutate inputs), appends the candidate, and evaluates rules for that staff plus the candidate coverage cell.
- `detectConflicts(context)` evaluates the full roster.

Roster review and publishing (Phase 3F) call `detectConflicts` through [`validateRoster`](../rosters/services/validation.ts). They do not add a second rules layer. They load the current organization policy before building context.

An understaffed roster is a valid database state. An overlap or approved-leave clash is not a valid assignment.

## Permissions and settings UI

`settings.view` can open `/settings/scheduling`. `settings.edit` can save. Existing RBAC: `SUPER_ADMIN` can edit; `ROSTER_MANAGER` can view; STAFF and supervisors cannot change organizational rules.

## Future automated scheduling

A later generator should:

1. Load organization policy into a `SchedulingContext`
2. Propose candidate assignments
3. Call `validateAssignment` / `detectConflicts`
4. Keep candidates where `valid === true`

It must not invent a second rules implementation or bypass this engine.
