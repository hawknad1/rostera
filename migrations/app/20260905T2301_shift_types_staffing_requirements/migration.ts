#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0701e758df582083c8ca05d5203b4a13b3fa8c504c183f09fcd2450e14d0b542/contract';
import startContract from '../../snapshots/0701e758df582083c8ca05d5203b4a13b3fa8c504c183f09fcd2450e14d0b542/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/1a83b59866d9c0d3d08bdaf9c5d6f2d05cbe7621cfe0c8771f79682c8c863c3f/contract';
import endContract from '../../snapshots/1a83b59866d9c0d3d08bdaf9c5d6f2d05cbe7621cfe0c8771f79682c8c863c3f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'shiftType',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('endTime', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isOvernight', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startTime', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'staffingRequirement',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('departmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('professionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requiredCount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('shiftTypeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'shiftType',
        constraint: 'shiftType_organizationId_name_key',
        columns: ['organizationId', 'name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'staffingRequirement',
        constraint: 'staffingRequirement_combo_key',
        columns: ['organizationId', 'departmentId', 'shiftTypeId', 'professionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftType',
        index: 'shiftType_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'staffingRequirement',
        index: 'staffingRequirement_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'staffingRequirement',
        index: 'staffingRequirement_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'staffingRequirement',
        index: 'staffingRequirement_professionId_idx_3000e629',
        columns: ['professionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'staffingRequirement',
        index: 'staffingRequirement_shiftTypeId_idx_d85655a9',
        columns: ['shiftTypeId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftType',
        foreignKey: {
          name: 'shiftType_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'staffingRequirement',
        foreignKey: {
          name: 'staffingRequirement_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'staffingRequirement',
        foreignKey: {
          name: 'staffingRequirement_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'staffingRequirement',
        foreignKey: {
          name: 'staffingRequirement_shiftTypeId_fkey',
          columns: ['shiftTypeId'],
          references: { schema: 'public', table: 'shiftType', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'staffingRequirement',
        foreignKey: {
          name: 'staffingRequirement_professionId_fkey',
          columns: ['professionId'],
          references: { schema: 'public', table: 'profession', columns: ['id'] },
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'shiftType' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'staffingRequirement' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
