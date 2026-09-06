#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1a83b59866d9c0d3d08bdaf9c5d6f2d05cbe7621cfe0c8771f79682c8c863c3f/contract';
import startContract from '../../snapshots/1a83b59866d9c0d3d08bdaf9c5d6f2d05cbe7621cfe0c8771f79682c8c863c3f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/aedb13f369679a2cb0300b54f92f0d88b46199498ed84491108241b61cddb498/contract';
import endContract from '../../snapshots/aedb13f369679a2cb0300b54f92f0d88b46199498ed84491108241b61cddb498/contract.json' with { type: 'json' };
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
        table: 'roster',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdByUserId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('departmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endDate', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
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
            'roster_status_check_19635beb',
            "\"status\" IN ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'AMENDED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'shiftAssignment',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('date', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('departmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endDateTime', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isOvernight', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('professionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rosterId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('shiftEndTime', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('shiftStartTime', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('shiftTypeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('staffId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startDateTime', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'shiftAssignment',
        constraint: 'shiftAssignment_combo_key',
        columns: ['rosterId', 'staffId', 'shiftTypeId', 'date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roster',
        index: 'roster_createdByUserId_idx_93e8a540',
        columns: ['createdByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roster',
        index: 'roster_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roster',
        index: 'roster_organizationId_departmentId_idx_425ca78f',
        columns: ['organizationId', 'departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roster',
        index: 'roster_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roster',
        index: 'roster_organizationId_startDate_endDate_idx_b7b01d99',
        columns: ['organizationId', 'startDate', 'endDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftAssignment',
        index: 'shiftAssignment_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftAssignment',
        index: 'shiftAssignment_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftAssignment',
        index: 'shiftAssignment_professionId_idx_3000e629',
        columns: ['professionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftAssignment',
        index: 'shiftAssignment_rosterId_date_idx_df8a9a1f',
        columns: ['rosterId', 'date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftAssignment',
        index: 'shiftAssignment_rosterId_idx_ca029c6b',
        columns: ['rosterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftAssignment',
        index: 'shiftAssignment_shiftTypeId_date_idx_9329ed49',
        columns: ['shiftTypeId', 'date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftAssignment',
        index: 'shiftAssignment_shiftTypeId_idx_d85655a9',
        columns: ['shiftTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftAssignment',
        index: 'shiftAssignment_staffId_date_idx_02db3481',
        columns: ['staffId', 'date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shiftAssignment',
        index: 'shiftAssignment_staffId_idx_ce92c64e',
        columns: ['staffId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roster',
        foreignKey: {
          name: 'roster_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roster',
        foreignKey: {
          name: 'roster_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'roster',
        foreignKey: {
          name: 'roster_createdByUserId_fkey',
          columns: ['createdByUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftAssignment',
        foreignKey: {
          name: 'shiftAssignment_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftAssignment',
        foreignKey: {
          name: 'shiftAssignment_rosterId_fkey',
          columns: ['rosterId'],
          references: { schema: 'public', table: 'roster', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftAssignment',
        foreignKey: {
          name: 'shiftAssignment_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftAssignment',
        foreignKey: {
          name: 'shiftAssignment_staffId_fkey',
          columns: ['staffId'],
          references: { schema: 'public', table: 'staffProfile', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftAssignment',
        foreignKey: {
          name: 'shiftAssignment_shiftTypeId_fkey',
          columns: ['shiftTypeId'],
          references: { schema: 'public', table: 'shiftType', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shiftAssignment',
        foreignKey: {
          name: 'shiftAssignment_professionId_fkey',
          columns: ['professionId'],
          references: { schema: 'public', table: 'profession', columns: ['id'] },
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'roster' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'shiftAssignment' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
