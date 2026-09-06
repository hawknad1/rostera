#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/9acf65ad5ff2677c6d472b262ceff9e6b72a2e164d849d856c3efebb57d0f246/contract';
import endContract from '../../snapshots/9acf65ad5ff2677c6d472b262ceff9e6b72a2e164d849d856c3efebb57d0f246/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f3b78639b417ee02669f1685229730267c4f5d0f51cd4e3f04991803211c9767/contract';
import startContract from '../../snapshots/f3b78639b417ee02669f1685229730267c4f5d0f51cd4e3f04991803211c9767/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'auditEvent',
        constraint: 'auditEvent_action_check_8d257f60',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'auditEvent',
        constraint: 'auditEvent_entityType_check_1d250f14',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_entityType_check_23970d2f',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_type_check_cdb06ba8',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notificationDelivery',
        constraint: 'notificationDelivery_eventType_check_485b977b',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notificationOutbox',
        constraint: 'notificationOutbox_eventType_check_485b977b',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notificationPreference',
        constraint: 'notificationPreference_eventType_check_485b977b',
      }),
      this.createTable({
        schema: 'public',
        table: 'attendanceEvent',
        columns: [
          col('actorUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('attendanceRecordId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('occurredAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('punchKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('staffId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'attendanceEvent_punch_key_state_05dae0e5',
            "(\"type\" IN ('CLOCK_IN', 'CLOCK_OUT', 'VOID') AND \"punchKey\" = \"type\") OR (\"type\" NOT IN ('CLOCK_IN', 'CLOCK_OUT', 'VOID') AND \"punchKey\" IS NULL)",
          ),
          checkExpression(
            'attendanceEvent_source_check_72e31ebd',
            "\"source\" IN ('STAFF_PWA', 'ADMIN', 'SYSTEM', 'DEVICE')",
          ),
          checkExpression(
            'attendanceEvent_type_check_de0a0cef',
            "\"type\" IN ('CLOCK_IN', 'CLOCK_OUT', 'MANUAL_CLOCK_IN', 'MANUAL_CLOCK_OUT', 'CORRECTION', 'VOID')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'attendanceException',
        columns: [
          col('attendanceRecordId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('detectedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resolvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('resolvedByUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('severity', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('staffId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'attendanceException_severity_check_1efcb0ef',
            "\"severity\" IN ('INFO', 'WARNING')",
          ),
          checkExpression(
            'attendanceException_status_check_bbf5c264',
            "\"status\" IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'WAIVED')",
          ),
          checkExpression(
            'attendanceException_type_check_c3f9a979',
            "\"type\" IN ('LATE_ARRIVAL', 'EARLY_DEPARTURE', 'MISSED_CLOCK_IN', 'MISSED_CLOCK_OUT', 'UNSCHEDULED_ATTENDANCE', 'OVERTIME', 'OUTSIDE_SCHEDULE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'attendanceRecord',
        columns: [
          col('actualClockInDateTime', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('actualClockOutDateTime', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('actualMinutes', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('approvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('approvedByUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('assignmentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('attendanceDate', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('earlyDepartureMinutes', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lateMinutes', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('openSessionKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('overtimeMinutes', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('reviewStatus', 'text', {
            notNull: true,
            default: lit('UNREVIEWED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('rosterId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scheduledEndDateTime', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('scheduledMinutes', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('scheduledStartDateTime', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('source', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('staffId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'attendanceRecord_clock_order_df6e0de9',
            '"actualClockOutDateTime" IS NULL OR "actualClockInDateTime" IS NULL OR "actualClockInDateTime" < "actualClockOutDateTime"',
          ),
          checkExpression(
            'attendanceRecord_minutes_non_negative_0e4a46f6',
            '"lateMinutes" >= 0 AND "earlyDepartureMinutes" >= 0 AND "overtimeMinutes" >= 0',
          ),
          checkExpression(
            'attendanceRecord_open_session_state_91438b77',
            '("status" = \'OPEN\' AND "openSessionKey" = \'OPEN\') OR ("status" <> \'OPEN\' AND "openSessionKey" IS NULL)',
          ),
          checkExpression(
            'attendanceRecord_reviewStatus_check_dc1bd288',
            "\"reviewStatus\" IN ('UNREVIEWED', 'APPROVED', 'REJECTED')",
          ),
          checkExpression(
            'attendanceRecord_source_check_72e31ebd',
            "\"source\" IN ('STAFF_PWA', 'ADMIN', 'SYSTEM', 'DEVICE')",
          ),
          checkExpression(
            'attendanceRecord_status_check_b8e3f284',
            "\"status\" IN ('OPEN', 'COMPLETED', 'MISSED', 'EXCEPTION', 'CORRECTED', 'VOIDED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'organizationAttendancePolicy',
        columns: [
          col('allowEarlyClockIn', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('allowUnscheduledAttendance', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('attendanceEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('earlyDepartureThresholdMinutes', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lateThresholdMinutes', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('maximumEarlyClockInMinutes', 'int4', {
            notNull: true,
            default: lit(120),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('maximumLateClockOutMinutes', 'int4', {
            notNull: true,
            default: lit(720),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('overtimeThresholdMinutes', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'attendancePolicy_early_clock_in_2a71cca9',
            '"maximumEarlyClockInMinutes" >= 0',
          ),
          checkExpression(
            'attendancePolicy_early_threshold_ea899a5a',
            '"earlyDepartureThresholdMinutes" >= 0',
          ),
          checkExpression(
            'attendancePolicy_late_clock_out_be26e741',
            '"maximumLateClockOutMinutes" >= 0',
          ),
          checkExpression(
            'attendancePolicy_late_threshold_8305e593',
            '"lateThresholdMinutes" >= 0',
          ),
          checkExpression(
            'attendancePolicy_overtime_threshold_da722c70',
            '"overtimeThresholdMinutes" >= 0',
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'attendanceEvent',
        constraint: 'attendanceEvent_punch_key',
        columns: ['attendanceRecordId', 'punchKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'attendanceRecord',
        constraint: 'attendanceRecord_open_session_key',
        columns: ['organizationId', 'staffId', 'openSessionKey'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'auditEvent',
        constraint: 'auditEvent_action_check_c0c9e06e',
        expression:
          "\"action\" IN ('ROSTER_CREATED', 'ROSTER_UPDATED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_PUBLISHED', 'ROSTER_AMENDMENT_CREATED', 'ROSTER_DELETED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_DELETED', 'LEAVE_CREATED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'STAFF_CREATED', 'STAFF_UPDATED', 'STAFF_DEACTIVATED', 'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_DELETED', 'DEPARTMENT_HEAD_ASSIGNED', 'DEPARTMENT_HEAD_REMOVED', 'PROFESSION_CREATED', 'PROFESSION_UPDATED', 'PROFESSION_DEACTIVATED', 'SHIFT_TYPE_CREATED', 'SHIFT_TYPE_UPDATED', 'SHIFT_TYPE_DEACTIVATED', 'STAFFING_REQUIREMENT_CREATED', 'STAFFING_REQUIREMENT_UPDATED', 'STAFFING_REQUIREMENT_DELETED', 'SCHEDULING_POLICY_UPDATED', 'USER_INVITED', 'USER_UPDATED', 'USER_DEACTIVATED', 'MEMBERSHIP_ROLE_CHANGED', 'MEMBERSHIP_ACTIVATED', 'MEMBERSHIP_DEACTIVATED', 'ATTENDANCE_CLOCKED_IN', 'ATTENDANCE_CLOCKED_OUT', 'ATTENDANCE_CORRECTED', 'ATTENDANCE_APPROVED', 'ATTENDANCE_REJECTED', 'ATTENDANCE_VOIDED', 'ATTENDANCE_EXCEPTION_RESOLVED', 'ATTENDANCE_POLICY_UPDATED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'auditEvent',
        constraint: 'auditEvent_entityType_check_98d0e24c',
        expression:
          "\"entityType\" IN ('ROSTER', 'ASSIGNMENT', 'LEAVE_REQUEST', 'SHIFT_SWAP', 'STAFF', 'DEPARTMENT', 'PROFESSION', 'SHIFT_TYPE', 'STAFFING_REQUIREMENT', 'SCHEDULING_POLICY', 'USER', 'MEMBERSHIP', 'ATTENDANCE', 'ATTENDANCE_POLICY')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_entityType_check_7c527aeb',
        expression: "\"entityType\" IN ('LEAVE_REQUEST', 'SHIFT_SWAP', 'ROSTER', 'ATTENDANCE')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_type_check_e6328a7f',
        expression:
          "\"type\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED', 'ATTENDANCE_CORRECTED', 'ATTENDANCE_APPROVED', 'ATTENDANCE_REJECTED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notificationDelivery',
        constraint: 'notificationDelivery_eventType_check_1f1ba224',
        expression:
          "\"eventType\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED', 'ATTENDANCE_CORRECTED', 'ATTENDANCE_APPROVED', 'ATTENDANCE_REJECTED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notificationOutbox',
        constraint: 'notificationOutbox_eventType_check_1f1ba224',
        expression:
          "\"eventType\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED', 'ATTENDANCE_CORRECTED', 'ATTENDANCE_APPROVED', 'ATTENDANCE_REJECTED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notificationPreference',
        constraint: 'notificationPreference_eventType_check_1f1ba224',
        expression:
          "\"eventType\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED', 'ATTENDANCE_CORRECTED', 'ATTENDANCE_APPROVED', 'ATTENDANCE_REJECTED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'organizationAttendancePolicy',
        constraint: 'organizationAttendancePolicy_organizationId_key',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceEvent',
        index: 'attendanceEvent_actorUserId_idx_96dac96c',
        columns: ['actorUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceEvent',
        index: 'attendanceEvent_org_idx',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceEvent',
        index: 'attendanceEvent_org_staff_idx',
        columns: ['organizationId', 'staffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceEvent',
        index: 'attendanceEvent_record_idx',
        columns: ['attendanceRecordId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceEvent',
        index: 'attendanceEvent_staffId_idx_ce92c64e',
        columns: ['staffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceException',
        index: 'attendanceException_org_idx',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceException',
        index: 'attendanceException_org_staff_idx',
        columns: ['organizationId', 'staffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceException',
        index: 'attendanceException_org_status_idx',
        columns: ['organizationId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceException',
        index: 'attendanceException_org_type_idx',
        columns: ['organizationId', 'type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceException',
        index: 'attendanceException_record_idx',
        columns: ['attendanceRecordId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceException',
        index: 'attendanceException_resolvedByUserId_idx_fe6c7b89',
        columns: ['resolvedByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceException',
        index: 'attendanceException_staffId_idx_ce92c64e',
        columns: ['staffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceRecord',
        index: 'attendanceRecord_approvedByUserId_idx_500ef1e1',
        columns: ['approvedByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceRecord',
        index: 'attendanceRecord_assignment_idx',
        columns: ['assignmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceRecord',
        index: 'attendanceRecord_org_date_idx',
        columns: ['organizationId', 'attendanceDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceRecord',
        index: 'attendanceRecord_org_idx',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceRecord',
        index: 'attendanceRecord_org_staff_date_idx',
        columns: ['organizationId', 'staffId', 'attendanceDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceRecord',
        index: 'attendanceRecord_org_status_idx',
        columns: ['organizationId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceRecord',
        index: 'attendanceRecord_roster_idx',
        columns: ['rosterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attendanceRecord',
        index: 'attendanceRecord_staffId_idx_ce92c64e',
        columns: ['staffId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceEvent',
        foreignKey: {
          name: 'attendanceEvent_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceEvent',
        foreignKey: {
          name: 'attendanceEvent_attendanceRecordId_fkey',
          columns: ['attendanceRecordId'],
          references: { schema: 'public', table: 'attendanceRecord', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceEvent',
        foreignKey: {
          name: 'attendanceEvent_staffId_fkey',
          columns: ['staffId'],
          references: { schema: 'public', table: 'staffProfile', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceEvent',
        foreignKey: {
          name: 'attendanceEvent_actorUserId_fkey',
          columns: ['actorUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceException',
        foreignKey: {
          name: 'attendanceException_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceException',
        foreignKey: {
          name: 'attendanceException_attendanceRecordId_fkey',
          columns: ['attendanceRecordId'],
          references: { schema: 'public', table: 'attendanceRecord', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceException',
        foreignKey: {
          name: 'attendanceException_staffId_fkey',
          columns: ['staffId'],
          references: { schema: 'public', table: 'staffProfile', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceException',
        foreignKey: {
          name: 'attendanceException_resolvedByUserId_fkey',
          columns: ['resolvedByUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceRecord',
        foreignKey: {
          name: 'attendanceRecord_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceRecord',
        foreignKey: {
          name: 'attendanceRecord_staffId_fkey',
          columns: ['staffId'],
          references: { schema: 'public', table: 'staffProfile', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceRecord',
        foreignKey: {
          name: 'attendanceRecord_rosterId_fkey',
          columns: ['rosterId'],
          references: { schema: 'public', table: 'roster', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceRecord',
        foreignKey: {
          name: 'attendanceRecord_assignmentId_fkey',
          columns: ['assignmentId'],
          references: { schema: 'public', table: 'shiftAssignment', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attendanceRecord',
        foreignKey: {
          name: 'attendanceRecord_approvedByUserId_fkey',
          columns: ['approvedByUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationAttendancePolicy',
        foreignKey: {
          name: 'organizationAttendancePolicy_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'attendanceEvent' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'attendanceException' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'attendanceRecord' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'organizationAttendancePolicy' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
