# Reporting

Phase 3P is Rostera’s reporting foundation. It produces authoritative operational metrics from current PostgreSQL data. It is not a warehouse, not a live analytics stream, and not a second staffing engine.

```
Authenticated membership (tenant + permission)
        ↓
Shared report filters (narrow only)
        ↓
Report dataset (org-scoped reads, in-memory date/version selection)
        ↓
Pure metric functions (documented formulas)
        ↓
Report DTOs → UI / CSV
```

UI pages never calculate metrics. Ordinary report reads do not write audit events and do not send notifications.

## Source of truth

| Concept | Source |
| --- | --- |
| Planned / scheduled | `ShiftAssignment` snapshots on the selected published roster version |
| Actual / worked | `AttendanceRecord` snapshot minutes |
| Availability | `LeaveRequest` rows (calendar dates) |
| Staffing requirement | `StaffingRequirement.requiredCount` |
| Coverage | Existing `calculateCoverage` engine |
| Accountability | Attendance exceptions and reconstructed scheduling conflicts |

Never treat scheduled hours as worked hours. Never infer requirements from assignment counts. Never fill missing attendance with scheduled duration.

## Operational vs historical

**Operational reporting** answers “what is true now?”

- Planned roster metrics use `selectCurrentPublishedRosters`: the highest `PUBLISHED` `versionNumber` per `seriesId`.
- Draft and `IN_REVIEW` versions are excluded.
- V1 and V2 published assignments are never summed. If V2 is the current published version, only V2 counts.

**Historical reporting** answers “what was true for this version or these facts?”

- Pin `rosterId` to a published version to report that version’s assignments. Draft IDs are rejected.
- Attendance and leave are always the stored records for the date range. They are not rewritten to match the current roster.
- After a V2 amendment, historical attendance keeps its original `assignmentId` / `rosterId` and snapshot minutes.

## Date and timezone

Filters use calendar dates `YYYY-MM-DD`.

- `dateFrom` inclusive
- `dateTo` inclusive
- Interpreted as the organization’s `Organization.timezone`, not the server timezone and not a silent UTC calendar

The default period is the current calendar month in that timezone.

Example: timezone `Pacific/Auckland`, `dateFrom=2026-09-01`, `dateTo=2026-09-30` means the local September 1–30 period.

Overnight assignments (22:00–06:00) belong to the assignment `date` / `attendanceDate`. Duration is the stored instant window (typically 8 hours). Reports do not split the shift because UTC midnight falls in the middle.

Maximum inclusive range: 93 days (`REPORT_TOO_LARGE` beyond that).

## Metric dictionary

Formulas live in `src/modules/reports/services/metrics.ts`. Other modules must not invent parallel definitions.

### Scheduled hours

Sum of assignment snapshot durations for the selected published roster versions, with assignment `date` in range.

Duration prefers `endDateTime - startDateTime` on the assignment. Fallback is the assignment’s own `shiftStartTime` / `shiftEndTime` / `isOvernight`. Current `ShiftType` configuration is not used.

`scheduledHours = scheduledMinutes / 60` (rounded to 2 decimal places)

### Worked hours

Sum of `AttendanceRecord.actualMinutes` for records with status `COMPLETED`, `EXCEPTION`, or `CORRECTED`.

VOIDED records are excluded. OPEN / missing attendance contribute **0** worked minutes, never scheduled minutes.

`workedHours = actualMinutes / 60`

### Overtime / late / early

Sums of attendance snapshot columns `overtimeMinutes`, `lateMinutes`, `earlyDepartureMinutes`. Historical policy is not reapplied.

### Eligible scheduled assignments

Current-published (or pinned) assignments in range whose staff member does **not** have approved leave covering the assignment `date`. Overnight shifts still use that assignment date. Partial-day leave is not modeled.

### Missing attendance

Eligible assignments with no non-voided attendance for that staff member on that date. Approved leave is excluded. Leave rows are not mutated.

### Attendance completion

`completed eligible assignments / eligible scheduled assignments`

A completed eligible assignment has a completed-status attendance record (`COMPLETED`, `EXCEPTION`, or `CORRECTED`) for that staff member on that date.

If eligible assignments = 0 → `null` / “No data”. Never 100% or 0% from an empty denominator.

### Punctuality

`completed records with lateMinutes = 0 / completed records`

If completed records = 0 → `null` / “No data”.

### Average lateness

Mean `lateMinutes` across completed records. Null when there are none.

### Coverage fill rate (overview)

For cells with `requiredCount > 0`:

`sum(min(assignedCount, requiredCount)) / sum(requiredCount)`

This never exceeds 100%. It answers how much of the required staffing was filled.

If required positions = 0 → `null` / “No requirement”.

### Cell coverage % (staffing table)

`assignedCount / requiredCount`

May exceed 100% when overstaffed. Status text is always shown: Under-covered, Fully covered, Over-covered, or No requirement.

`requiredCount = 0` → “No requirement”, not 100%.

### Leave days

Request **Days** = inclusive calendar day count of `startDate`–`endDate`.

Overview **approved leave days** = that count clipped to the report range.

Leave is operational (ANNUAL, SICK, …). Reports do not claim Ghana statutory entitlements.

## Scheduling exceptions

Rostera does not persist historical scheduling validation results. The exceptions report reconstructs conflicts for current published rosters that overlap the period, using **today’s** scheduling policy.

Severity bands:

- BLOCKING — `conflict.blocking`
- WARNING — non-blocking, non-INFO
- INFO — `severity === INFO`

This is not “what the policy said at publish time.”

## Permissions

Existing keys only:

- `reports.view` — admin reporting surface
- `reports.export` — CSV

STAFF does not receive `reports.view`. Admin layout still requires `hasAdminSurfaceAccess`, so a generic report permission cannot open `/reports` for STAFF.

Filters never expand tenant scope. `organizationId` is not accepted from the client. `staffId` / `departmentId` must belong to the authenticated organization (`INVALID_FILTER` otherwise).

## CSV export

Server-side only (`/reports/export?kind=`). Kinds: `attendance`, `staffing`, `leave`, `staff`.

- UTF-8 with BOM
- Stable headers
- Human-readable names and staff numbers, not internal IDs
- Values starting with `=`, `+`, `-`, `@`, tab, or CR are prefixed with `'`
- Quotes, commas, and newlines are escaped
- Same filters and permission checks as the UI
- Cap: 10,000 rows (`REPORT_TOO_LARGE`)

Export is not audited in this phase (optional `REPORT_EXPORTED` would require an audit enum migration). Reads must not audit.

## Pagination

Tables use 25 rows. CSV is generated on the server, never by loading the full result into the browser.

## Prisma 8 / performance

The current ORM is equality-`where` then in-memory filtering. Report loaders read organization-scoped collections (`ShiftAssignment`, `AttendanceRecord`, `LeaveRequest`, …) and then apply date range, version, and filter predicates in memory.

That is acceptable for tens to low hundreds of staff and bounded date ranges. It is the same pattern as attendance, leave, and audit.

When organizations routinely exceed a few thousand staff or need year-long interactive reports, add SQL/materialized reporting projections **without changing the public DTOs**. Do not introduce a warehouse in this phase.

No extra reporting tables or speculative indexes were added.

## What this module does not do

- Mutate rosters, attendance, or leave
- Call notification providers
- Use SWR, WebSockets, Redis, or polling
- Recalculate historical attendance from current policy
- Recalculate historical assignment duration from current shift types
- Hardcode `Africa/Accra` or `+233`
