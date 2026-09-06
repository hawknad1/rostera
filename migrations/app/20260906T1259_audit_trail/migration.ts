#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6da9f8a46f4f5ab5f926ae10bd6a9828921d4412f4d8fc8ff3a921bb4ee82531/contract';
import startContract from '../../snapshots/6da9f8a46f4f5ab5f926ae10bd6a9828921d4412f4d8fc8ff3a921bb4ee82531/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fef1e66b6a7d3c74e3c219dcb1b7e0a70df733b87d2a1e21432d78f077f7bb64/contract';
import endContract from '../../snapshots/fef1e66b6a7d3c74e3c219dcb1b7e0a70df733b87d2a1e21432d78f077f7bb64/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'auditEvent',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorMembershipId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('actorType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('entityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ipAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requestId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('summary', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userAgent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'auditEvent_action_check_156c0448',
            "\"action\" IN ('ROSTER_CREATED', 'ROSTER_UPDATED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_PUBLISHED', 'ROSTER_DELETED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_DELETED', 'LEAVE_CREATED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'STAFF_CREATED', 'STAFF_UPDATED', 'STAFF_DEACTIVATED', 'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_DELETED', 'DEPARTMENT_HEAD_ASSIGNED', 'DEPARTMENT_HEAD_REMOVED', 'PROFESSION_CREATED', 'PROFESSION_UPDATED', 'PROFESSION_DEACTIVATED', 'SHIFT_TYPE_CREATED', 'SHIFT_TYPE_UPDATED', 'SHIFT_TYPE_DEACTIVATED', 'STAFFING_REQUIREMENT_CREATED', 'STAFFING_REQUIREMENT_UPDATED', 'STAFFING_REQUIREMENT_DELETED', 'SCHEDULING_POLICY_UPDATED', 'USER_INVITED', 'USER_UPDATED', 'USER_DEACTIVATED', 'MEMBERSHIP_ROLE_CHANGED', 'MEMBERSHIP_ACTIVATED', 'MEMBERSHIP_DEACTIVATED')",
          ),
          checkExpression(
            'auditEvent_actorType_check_22fc4720',
            "\"actorType\" IN ('USER', 'SYSTEM')",
          ),
          checkExpression(
            'auditEvent_entityType_check_1d250f14',
            "\"entityType\" IN ('ROSTER', 'ASSIGNMENT', 'LEAVE_REQUEST', 'SHIFT_SWAP', 'STAFF', 'DEPARTMENT', 'PROFESSION', 'SHIFT_TYPE', 'STAFFING_REQUIREMENT', 'SCHEDULING_POLICY', 'USER', 'MEMBERSHIP')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'auditEvent',
        constraint: 'auditEvent_event_key',
        columns: ['organizationId', 'eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditEvent',
        index: 'auditEvent_actorMembershipId_idx_993b1bc0',
        columns: ['actorMembershipId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditEvent',
        index: 'auditEvent_actorUserId_idx_96dac96c',
        columns: ['actorUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditEvent',
        index: 'auditEvent_org_action_idx',
        columns: ['organizationId', 'action', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditEvent',
        index: 'auditEvent_org_actor_idx',
        columns: ['organizationId', 'actorUserId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditEvent',
        index: 'auditEvent_org_created_idx',
        columns: ['organizationId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditEvent',
        index: 'auditEvent_org_entity_idx',
        columns: ['organizationId', 'entityType', 'entityId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditEvent',
        index: 'auditEvent_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditEvent',
        foreignKey: {
          name: 'auditEvent_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditEvent',
        foreignKey: {
          name: 'auditEvent_actorUserId_fkey',
          columns: ['actorUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditEvent',
        foreignKey: {
          name: 'auditEvent_actorMembershipId_fkey',
          columns: ['actorMembershipId'],
          references: { schema: 'public', table: 'organizationMember', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'auditEvent' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
