#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/f3b78639b417ee02669f1685229730267c4f5d0f51cd4e3f04991803211c9767/contract';
import endContract from '../../snapshots/f3b78639b417ee02669f1685229730267c4f5d0f51cd4e3f04991803211c9767/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fcba91f26e69889279d2d7944c315129c8195829dc6cce65f16b2b54e49e6b89/contract';
import startContract from '../../snapshots/fcba91f26e69889279d2d7944c315129c8195829dc6cce65f16b2b54e49e6b89/contract.json' with { type: 'json' };
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
        table: 'notificationDelivery',
        columns: [
          col('attemptCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('availableAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('channel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deliveredAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('destination', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('failedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notificationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notificationOutboxId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('processingStartedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('providerMessageId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('recipientUserId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sentAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('templateKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'notificationDelivery_channel_check_90967890',
            "\"channel\" IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP')",
          ),
          checkExpression(
            'notificationDelivery_eventType_check_485b977b',
            "\"eventType\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED')",
          ),
          checkExpression(
            'notificationDelivery_provider_check_fe2ede52',
            "\"provider\" IN ('IN_APP', 'RESEND', 'TWILIO_SMS', 'TWILIO_WHATSAPP')",
          ),
          checkExpression(
            'notificationDelivery_status_check_1e8e023a',
            "\"status\" IN ('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'notificationDeliveryReceipt',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deliveryId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('providerEventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'notificationDeliveryReceipt_provider_check_fe2ede52',
            "\"provider\" IN ('IN_APP', 'RESEND', 'TWILIO_SMS', 'TWILIO_WHATSAPP')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'notificationPreference',
        columns: [
          col('channel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('enabled', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'notificationPreference_channel_check_90967890',
            "\"channel\" IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP')",
          ),
          checkExpression(
            'notificationPreference_eventType_check_485b977b',
            "\"eventType\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'notificationOutbox',
        column: col('processingStartedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'notificationDelivery',
        constraint: 'notificationDelivery_idempotency_key',
        columns: ['organizationId', 'eventType', 'eventId', 'recipientUserId', 'channel'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'notificationDeliveryReceipt',
        constraint: 'notificationDeliveryReceipt_event_key',
        columns: ['organizationId', 'provider', 'providerEventId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'notificationPreference',
        constraint: 'notificationPreference_key',
        columns: ['organizationId', 'userId', 'eventType', 'channel'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationDelivery',
        index: 'notificationDelivery_notificationId_idx_adfe2654',
        columns: ['notificationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationDelivery',
        index: 'notificationDelivery_notificationOutboxId_idx_ffd4ed7b',
        columns: ['notificationOutboxId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationDelivery',
        index: 'notificationDelivery_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationDelivery',
        index: 'notificationDelivery_pickup_idx',
        columns: ['organizationId', 'status', 'availableAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationDelivery',
        index: 'notificationDelivery_provider_message_idx',
        columns: ['organizationId', 'providerMessageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationDelivery',
        index: 'notificationDelivery_recipientUserId_idx_fd367dfa',
        columns: ['recipientUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationDeliveryReceipt',
        index: 'notificationDeliveryReceipt_deliveryId_idx_ebc950f6',
        columns: ['deliveryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationDeliveryReceipt',
        index: 'notificationDeliveryReceipt_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationPreference',
        index: 'notificationPreference_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationPreference',
        index: 'notificationPreference_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationPreference',
        index: 'notificationPreference_user_idx',
        columns: ['organizationId', 'userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationDelivery',
        foreignKey: {
          name: 'notificationDelivery_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationDelivery',
        foreignKey: {
          name: 'notificationDelivery_notificationOutboxId_fkey',
          columns: ['notificationOutboxId'],
          references: { schema: 'public', table: 'notificationOutbox', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationDelivery',
        foreignKey: {
          name: 'notificationDelivery_notificationId_fkey',
          columns: ['notificationId'],
          references: { schema: 'public', table: 'notification', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationDelivery',
        foreignKey: {
          name: 'notificationDelivery_recipientUserId_fkey',
          columns: ['recipientUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationDeliveryReceipt',
        foreignKey: {
          name: 'notificationDeliveryReceipt_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationDeliveryReceipt',
        foreignKey: {
          name: 'notificationDeliveryReceipt_deliveryId_fkey',
          columns: ['deliveryId'],
          references: { schema: 'public', table: 'notificationDelivery', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationPreference',
        foreignKey: {
          name: 'notificationPreference_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationPreference',
        foreignKey: {
          name: 'notificationPreference_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'notificationDelivery' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'notificationDeliveryReceipt' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'notificationPreference' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
