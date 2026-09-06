#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8d89ae4b904c4ca01f78a560e804520bc34f9bd3535d1c107c119df9f724daf9/contract';
import startContract from '../../snapshots/8d89ae4b904c4ca01f78a560e804520bc34f9bd3535d1c107c119df9f724daf9/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/98b17e1d9e257d081aa70fd73d38c2038132d65970fe4574c73a8a4696e38c0c/contract';
import endContract from '../../snapshots/98b17e1d9e257d081aa70fd73d38c2038132d65970fe4574c73a8a4696e38c0c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'organizationSchedulingPolicy',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maximumConsecutiveDays', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('maximumNightShiftsPerWeek', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('maximumWeekendShifts', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('maximumWeeklyMinutes', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('minimumRestMinutes', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'organizationSchedulingPolicy',
        constraint: 'organizationSchedulingPolicy_organizationId_key',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationSchedulingPolicy',
        foreignKey: {
          name: 'organizationSchedulingPolicy_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'organizationSchedulingPolicy' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
