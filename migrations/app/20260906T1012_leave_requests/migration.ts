#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/98b17e1d9e257d081aa70fd73d38c2038132d65970fe4574c73a8a4696e38c0c/contract';
import startContract from '../../snapshots/98b17e1d9e257d081aa70fd73d38c2038132d65970fe4574c73a8a4696e38c0c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a2fc0cbc5d315c9619f7b2655e73e93c553df0500593ede8fdb5d59388473055/contract';
import endContract from '../../snapshots/a2fc0cbc5d315c9619f7b2655e73e93c553df0500593ede8fdb5d59388473055/contract.json' with { type: 'json' };
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
        table: 'leaveRequest',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('endDate', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('leaveType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requestedByUserId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reviewedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('reviewedByUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('staffId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
          checkExpression('leaveRequest_date_order_2aa69aa6', '"startDate" <= "endDate"'),
          checkExpression(
            'leaveRequest_leaveType_check_8e9923c5',
            "\"leaveType\" IN ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'STUDY', 'COMPASSIONATE', 'OTHER')",
          ),
          checkExpression(
            'leaveRequest_status_check_57fe5f48',
            "\"status\" IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')",
          ),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leaveRequest',
        index: 'leaveRequest_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leaveRequest',
        index: 'leaveRequest_organizationId_staffId_idx_4ac10b62',
        columns: ['organizationId', 'staffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leaveRequest',
        index: 'leaveRequest_organizationId_status_idx_21af5e82',
        columns: ['organizationId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leaveRequest',
        index: 'leaveRequest_requestedByUserId_idx_85281b2d',
        columns: ['requestedByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leaveRequest',
        index: 'leaveRequest_reviewedByUserId_idx_e62d4e38',
        columns: ['reviewedByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leaveRequest',
        index: 'leaveRequest_staffId_idx_ce92c64e',
        columns: ['staffId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'leaveRequest',
        index: 'leaveRequest_staffId_status_startDate_endDate_idx_0f091dbe',
        columns: ['staffId', 'status', 'startDate', 'endDate'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'leaveRequest',
        foreignKey: {
          name: 'leaveRequest_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'leaveRequest',
        foreignKey: {
          name: 'leaveRequest_staffId_fkey',
          columns: ['staffId'],
          references: { schema: 'public', table: 'staffProfile', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'leaveRequest',
        foreignKey: {
          name: 'leaveRequest_requestedByUserId_fkey',
          columns: ['requestedByUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'leaveRequest',
        foreignKey: {
          name: 'leaveRequest_reviewedByUserId_fkey',
          columns: ['reviewedByUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'leaveRequest' }),
    ]
  }
}

MigrationCLI.run(import.meta.url, M);
