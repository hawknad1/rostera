#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/08af83df13430ff5bc0f9938e00950a54c3c6038190fcceb2188210aac1e88a8/contract';
import startContract from '../../snapshots/08af83df13430ff5bc0f9938e00950a54c3c6038190fcceb2188210aac1e88a8/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6da9f8a46f4f5ab5f926ae10bd6a9828921d4412f4d8fc8ff3a921bb4ee82531/contract';
import endContract from '../../snapshots/6da9f8a46f4f5ab5f926ae10bd6a9828921d4412f4d8fc8ff3a921bb4ee82531/contract.json' with { type: 'json' };
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
      this.createTable({
        schema: 'public',
        table: 'notification',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('entityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('entityType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('readAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('recipientUserId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'notification_entityType_check_23970d2f',
            "\"entityType\" IN ('LEAVE_REQUEST', 'SHIFT_SWAP', 'ROSTER')",
          ),
          checkExpression(
            'notification_type_check_c9ddaf51',
            "\"type\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'notificationOutbox',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('availableAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('payload', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('processedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'notificationOutbox_eventType_check_e92a4b3e',
            "\"eventType\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT')",
          ),
          checkExpression(
            'notificationOutbox_status_check_48358bb5',
            "\"status\" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_idempotency_key',
        columns: ['organizationId', 'recipientUserId', 'type', 'eventId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'notificationOutbox',
        constraint: 'notificationOutbox_event_key',
        columns: ['organizationId', 'eventType', 'eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_inbox_created_idx',
        columns: ['organizationId', 'recipientUserId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_inbox_read_idx',
        columns: ['organizationId', 'recipientUserId', 'readAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_recipientUserId_idx_fd367dfa',
        columns: ['recipientUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationOutbox',
        index: 'notificationOutbox_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationOutbox',
        index: 'notificationOutbox_pickup_idx',
        columns: ['organizationId', 'status', 'availableAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_recipientUserId_fkey',
          columns: ['recipientUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationOutbox',
        foreignKey: {
          name: 'notificationOutbox_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'notification' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'notificationOutbox' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
