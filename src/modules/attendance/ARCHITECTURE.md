# Attendance

Phase 3O records **actual** presence separately from **planned** roster assignments. Attendance never updates a published roster, never creates assignments, and never hard-deletes history.

```
Roster assignment (planned)
        ↓
Attendance record (interpreted current state)
        ↓
Attendance events (append-only what happened)
        ↓
Exception detection (pure calculation)
        ↓
Correction / approval
        ↓
Audit (same transaction) + optional notifications
```

## Planned vs actual

A roster assignment is the plan: staff scheduled 08:00–16:00. An attendance event is a fact: staff clocked in at 08:07. The attendance record is the current interpretation of those facts for reporting: clock-in 08:07, clock-out 16:12, late 7 minutes.

Attendance is not another kind of assignment. Changing attendance does not rewrite `ShiftAssignment` rows.

## AttendanceRecord vs AttendanceEvent

`AttendanceRecord` is mutable interpreted state: current clock times, snapshot minute totals, lifecycle status, review status.

`AttendanceEvent` is append-only. The application does not update or delete events. Corrections add `MANUAL_CLOCK_IN`, `MANUAL_CLOCK_OUT`, or `CORRECTION` events and then update the record.

`STAFF_PWA` is one event source. `ADMIN`, `SYSTEM`, and `DEVICE` exist so future biometric terminals, kiosks, and RFID readers can emit the same normalized events. This phase does not implement devices.

## Status vs exceptions

Record `status` is lifecycle: `OPEN`, `COMPLETED`, `EXCEPTION`, `CORRECTED`, `VOIDED`. `MISSED` is reserved; MVP does not materialize a row for every unpublished punch. Missing attendance is a query: published assignment + no non-voided record + not on approved leave.

`EXCEPTION` means the record is closed (or otherwise evaluated) with open exception rows. Open sessions stay `OPEN` even if they are already late.

Exception types (`LATE_ARRIVAL`, `EARLY_DEPARTURE`, `OVERTIME`, `UNSCHEDULED_ATTENDANCE`, `OUTSIDE_SCHEDULE`, …) live on `AttendanceException` with their own lifecycle (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `WAIVED`). Re-evaluation resolves previous `OPEN` exceptions and inserts the current set. Exception rows are not physically deleted.

## Policy

`OrganizationAttendancePolicy` is organization-scoped configuration, not a labour-law engine.

Defaults (conservative, explicit, no invented grace):

- attendance enabled
- late / early-departure / overtime thresholds = 0 (any positive deviation is an exception)
- unscheduled attendance allowed
- early clock-in allowed
- maximum early clock-in = 120 minutes
- maximum late clock-out calculation window = 720 minutes (match window and overtime cap)

Policy changes do not rewrite historical snapshot columns (`scheduledMinutes`, `actualMinutes`, `lateMinutes`, `earlyDepartureMinutes`, `overtimeMinutes`). Recalculation happens only on an explicit, audited correction.

## Timezone and overnight shifts

Instants are stored as timestamptz. Calendar `attendanceDate`, “today”, and display times use the organization’s timezone. The domain does not hardcode `Africa/Accra` or `+233`.

For overnight assignments (22:00 → 06:00), `attendanceDate` is the **assignment date**, not the calendar date after midnight. Clocking in at 05:50 still belongs to the previous assignment date.

## Corrections and approval

Staff cannot edit their own attendance in MVP. `attendance.correct` (HR / super-admin) requires a reason. The original events remain. Status becomes `CORRECTED` once a clock-out exists; an open session that only has a corrected clock-in stays `OPEN` so the staff member can still clock out.

Normal clock-in/out does not need approval (`reviewStatus` stays `UNREVIEWED`). Manual corrections stay unreviewed until `attendance.approve`. Rejecting a correction does not automatically restore previous snapshot values; a further correction is required. Voiding sets `VOIDED` and preserves events.

## Roster amendments and swaps

Clock-in matches the **current published** roster version (`selectCurrentPublishedRosters`). Draft / in-review amendments are ignored.

If a roster is later amended or a swap completes on a new published version, historical attendance keeps the `assignmentId` / `rosterId` it linked at the time. Attendance is not migrated from V1 to V2.

Future punches use the new published assignments.

## Leave

Approved leave covering `attendanceDate` excludes that staff member from the missing-attendance query. Leave rows are not mutated. Attendance records are not created because leave exists. Clocking in while on approved leave is allowed if policy permits attendance; `OUTSIDE_SCHEDULE` may be recorded.

## Concurrency

PostgreSQL unique `(organizationId, staffId, openSessionKey)` with `openSessionKey = 'OPEN'` while the session is open (NULL otherwise). PostgreSQL unique indexes treat NULLs as distinct, so many completed rows can exist.

`(attendanceRecordId, punchKey)` is unique for `CLOCK_IN`, `CLOCK_OUT`, and `VOID` so duplicate punches cannot commit.

Prisma 8 does not expose partial unique indexes. The CHECK constraints keep `openSessionKey` / `punchKey` aligned with status and type.

Prisma 8 `where` is equality-only. Admin lists load by organization (and usually `attendanceDate`) then filter department / exception type in memory, consistent with notifications and audit.

## Audit and notifications

Mutations write audit events in the same transaction: `ATTENDANCE_CLOCKED_IN`, `CLOCKED_OUT`, `CORRECTED`, `APPROVED`, `REJECTED`, `VOIDED`, `POLICY_UPDATED`. If audit insert fails, the attendance mutation rolls back.

Normal punches do not notify. Corrections, approvals, and rejections enqueue the existing notification outbox (`ATTENDANCE_CORRECTED` / `APPROVED` / `REJECTED`) for the affected staff user. Providers are never called from the attendance module. There is no SMS/WhatsApp blast for clock-in/out.

## Staff PWA

`/me/attendance` clocks in/out online only. Offline UI disables submit; there is no queued punch. Cached roster data remains read-only. Identity is always `auth user → User → ACTIVE membership → StaffProfile.userId`.

## Prisma 8 / Postgres limitations

- No `SELECT FOR UPDATE`. Open-session uniqueness and punch keys are the concurrency backstop.
- No partial unique indexes; nullable unique columns plus CHECKs approximate “one OPEN session”.
- Equality `where` only; date-range and department filters are in-memory after a tenant-scoped read.
- Enum expansions drop and re-add CHECK constraints on audit/notification tables (additive values, no table drops). Existing GiST overlap exclusions are untouched.
