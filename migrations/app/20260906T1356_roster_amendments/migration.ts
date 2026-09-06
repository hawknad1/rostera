#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/fcba91f26e69889279d2d7944c315129c8195829dc6cce65f16b2b54e49e6b89/contract';
import endContract from '../../snapshots/fcba91f26e69889279d2d7944c315129c8195829dc6cce65f16b2b54e49e6b89/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fef1e66b6a7d3c74e3c219dcb1b7e0a70df733b87d2a1e21432d78f077f7bb64/contract';
import startContract from '../../snapshots/fef1e66b6a7d3c74e3c219dcb1b7e0a70df733b87d2a1e21432d78f077f7bb64/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'auditEvent',
        constraint: 'auditEvent_action_check_156c0448',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_type_check_c9ddaf51',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notificationOutbox',
        constraint: 'notificationOutbox_eventType_check_e92a4b3e',
      }),
      this.addColumn({
        schema: 'public',
        table: 'roster',
        column: col('amendmentReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'roster',
        column: col('parentRosterId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'roster',
        column: col('versionNumber', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'shiftAssignment',
        column: col('copiedFromAssignmentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'roster',
        column: col('seriesId', 'text', {
          notNull: true,
          default: fn('gen_random_uuid()'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'auditEvent',
        constraint: 'auditEvent_action_check_8d257f60',
        expression:
          "\"action\" IN ('ROSTER_CREATED', 'ROSTER_UPDATED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_PUBLISHED', 'ROSTER_AMENDMENT_CREATED', 'ROSTER_DELETED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_DELETED', 'LEAVE_CREATED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'STAFF_CREATED', 'STAFF_UPDATED', 'STAFF_DEACTIVATED', 'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_DELETED', 'DEPARTMENT_HEAD_ASSIGNED', 'DEPARTMENT_HEAD_REMOVED', 'PROFESSION_CREATED', 'PROFESSION_UPDATED', 'PROFESSION_DEACTIVATED', 'SHIFT_TYPE_CREATED', 'SHIFT_TYPE_UPDATED', 'SHIFT_TYPE_DEACTIVATED', 'STAFFING_REQUIREMENT_CREATED', 'STAFFING_REQUIREMENT_UPDATED', 'STAFFING_REQUIREMENT_DELETED', 'SCHEDULING_POLICY_UPDATED', 'USER_INVITED', 'USER_UPDATED', 'USER_DEACTIVATED', 'MEMBERSHIP_ROLE_CHANGED', 'MEMBERSHIP_ACTIVATED', 'MEMBERSHIP_DEACTIVATED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_type_check_cdb06ba8',
        expression:
          "\"type\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notificationOutbox',
        constraint: 'notificationOutbox_eventType_check_485b977b',
        expression:
          "\"eventType\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'roster',
        constraint: 'roster_version_number_c9127633',
        expression: '"versionNumber" >= 1',
      }),
      this.addUnique({
        schema: 'public',
        table: 'roster',
        constraint: 'roster_series_version_key',
        columns: ['organizationId', 'seriesId', 'versionNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roster',
        index: 'roster_organizationId_seriesId_idx_7543e97d',
        columns: ['organizationId', 'seriesId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roster',
        index: 'roster_parentRosterId_idx_849936b5',
        columns: ['parentRosterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftAssignment',
        index: 'shiftAssignment_copiedFromAssignmentId_idx_bbc1c558',
        columns: ['copiedFromAssignmentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roster',
        foreignKey: {
          name: 'roster_parentRosterId_fkey',
          columns: ['parentRosterId'],
          references: { schema: 'public', table: 'roster', columns: ['id'] },
        },
      }),
      rawSql({
        id: 'exclusion.shiftAssignment.shiftAssignment_staff_roster_time_excl',
        label:
          'Scope assignment overlap exclusion to a single roster so historical versions can coexist',
        operationClass: 'additive',
        invariantId: 'rostera:shiftAssignment_staff_roster_time_excl',
        target: { id: 'postgres' },
        precheck: [
          {
            description: 'ensure constraint "shiftAssignment_staff_roster_time_excl" does not exist',
            sql: 'SELECT NOT EXISTS (SELECT 1 AS "one" FROM "pg_constraint" AS "c" INNER JOIN "pg_namespace" AS "n" ON "n"."oid" = "c"."connamespace" WHERE ("c"."conname" = $1 AND "n"."nspname" = $2 AND "c"."conrelid" = to_regclass($3))) AS "result"',
            params: ['shiftAssignment_staff_roster_time_excl', 'public', '"public"."shiftAssignment"'],
          },
        ],
        execute: [
          {
            description: 'drop organization-wide staff time exclusion if present',
            sql: 'ALTER TABLE "public"."shiftAssignment" DROP CONSTRAINT IF EXISTS "shiftAssignment_staff_time_excl"',
          },
          {
            description: 'add roster-scoped staff time exclusion',
            sql: 'ALTER TABLE "public"."shiftAssignment" ADD CONSTRAINT "shiftAssignment_staff_roster_time_excl" EXCLUDE USING gist ("staffId" WITH =, "rosterId" WITH =, tstzrange("startDateTime", "endDateTime", \'[)\') WITH &&)',
          },
        ],
        postcheck: [
          {
            description: 'verify constraint "shiftAssignment_staff_roster_time_excl" exists',
            sql: 'SELECT EXISTS (SELECT 1 AS "one" FROM "pg_constraint" AS "c" INNER JOIN "pg_namespace" AS "n" ON "n"."oid" = "c"."connamespace" WHERE ("c"."conname" = $1 AND "n"."nspname" = $2 AND "c"."conrelid" = to_regclass($3))) AS "result"',
            params: ['shiftAssignment_staff_roster_time_excl', 'public', '"public"."shiftAssignment"'],
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
