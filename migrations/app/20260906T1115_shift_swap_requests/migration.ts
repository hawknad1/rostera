#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/08af83df13430ff5bc0f9938e00950a54c3c6038190fcceb2188210aac1e88a8/contract';
import endContract from '../../snapshots/08af83df13430ff5bc0f9938e00950a54c3c6038190fcceb2188210aac1e88a8/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a2fc0cbc5d315c9619f7b2655e73e93c553df0500593ede8fdb5d59388473055/contract';
import startContract from '../../snapshots/a2fc0cbc5d315c9619f7b2655e73e93c553df0500593ede8fdb5d59388473055/contract.json' with { type: 'json' };
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
        table: 'shiftSwapRequest',
        columns: [
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('departmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestedByUserId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requesterStaffId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reviewNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reviewedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('reviewedByUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('rosterId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceAssignmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('targetAssignmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('targetStaffId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'shiftSwapRequest_status_check_a7da2396',
            "\"status\" IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED')",
          ),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftSwapRequest',
        index: 'shiftSwapRequest_organizationId_departmentId_idx_425ca78f',
        columns: ['organizationId', 'departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftSwapRequest',
        index: 'shiftSwapRequest_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftSwapRequest',
        index: 'shiftSwapRequest_organizationId_status_idx_21af5e82',
        columns: ['organizationId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftSwapRequest',
        index: 'shiftSwapRequest_requestedByUserId_idx_85281b2d',
        columns: ['requestedByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftSwapRequest',
        index: 'shiftSwapRequest_requesterStaffId_idx_88362500',
        columns: ['requesterStaffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftSwapRequest',
        index: 'shiftSwapRequest_reviewedByUserId_idx_e62d4e38',
        columns: ['reviewedByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftSwapRequest',
        index: 'shiftSwapRequest_rosterId_idx_ca029c6b',
        columns: ['rosterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftSwapRequest',
        index: 'shiftSwapRequest_sourceAssignmentId_idx_08c15448',
        columns: ['sourceAssignmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftSwapRequest',
        index: 'shiftSwapRequest_targetAssignmentId_idx_72b8162f',
        columns: ['targetAssignmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftSwapRequest',
        index: 'shiftSwapRequest_targetStaffId_idx_39aa2c56',
        columns: ['targetStaffId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftSwapRequest',
        foreignKey: {
          name: 'shiftSwapRequest_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftSwapRequest',
        foreignKey: {
          name: 'shiftSwapRequest_rosterId_fkey',
          columns: ['rosterId'],
          references: { schema: 'public', table: 'roster', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftSwapRequest',
        foreignKey: {
          name: 'shiftSwapRequest_sourceAssignmentId_fkey',
          columns: ['sourceAssignmentId'],
          references: { schema: 'public', table: 'shiftAssignment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftSwapRequest',
        foreignKey: {
          name: 'shiftSwapRequest_targetAssignmentId_fkey',
          columns: ['targetAssignmentId'],
          references: { schema: 'public', table: 'shiftAssignment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftSwapRequest',
        foreignKey: {
          name: 'shiftSwapRequest_requesterStaffId_fkey',
          columns: ['requesterStaffId'],
          references: { schema: 'public', table: 'staffProfile', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftSwapRequest',
        foreignKey: {
          name: 'shiftSwapRequest_targetStaffId_fkey',
          columns: ['targetStaffId'],
          references: { schema: 'public', table: 'staffProfile', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftSwapRequest',
        foreignKey: {
          name: 'shiftSwapRequest_requestedByUserId_fkey',
          columns: ['requestedByUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftSwapRequest',
        foreignKey: {
          name: 'shiftSwapRequest_reviewedByUserId_fkey',
          columns: ['reviewedByUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'shiftSwapRequest' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
