#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/9acf65ad5ff2677c6d472b262ceff9e6b72a2e164d849d856c3efebb57d0f246/contract';
import startContract from '../../snapshots/9acf65ad5ff2677c6d472b262ceff9e6b72a2e164d849d856c3efebb57d0f246/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c2b000c793ecfbc1868c2b3020d3e747248d787429ecd6d32ae9ff9044b85b5b/contract';
import endContract from '../../snapshots/c2b000c793ecfbc1868c2b3020d3e747248d787429ecd6d32ae9ff9044b85b5b/contract.json' with { type: 'json' };
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
        constraint: 'auditEvent_action_check_c0c9e06e',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'auditEvent',
        constraint: 'auditEvent_entityType_check_98d0e24c',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_entityType_check_7c527aeb',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_type_check_e6328a7f',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notificationDelivery',
        constraint: 'notificationDelivery_eventType_check_1f1ba224',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notificationOutbox',
        constraint: 'notificationOutbox_eventType_check_1f1ba224',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notificationPreference',
        constraint: 'notificationPreference_eventType_check_1f1ba224',
      }),
      this.createTable({
        schema: 'public',
        table: 'organizationInvitation',
        columns: [
          col('acceptedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('acceptedByUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invitedByUserId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('roleId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'organizationInvitation_status_check_c603248a',
            "\"status\" IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'organization',
        column: col('organizationType', 'text', {
          notNull: true,
          default: lit('HOSPITAL'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'role',
        column: col('isActive', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'role',
        column: col('isSystem', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('displayName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'auditEvent',
        constraint: 'auditEvent_action_check_c40f2472',
        expression:
          "\"action\" IN ('ROSTER_CREATED', 'ROSTER_UPDATED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_PUBLISHED', 'ROSTER_AMENDMENT_CREATED', 'ROSTER_DELETED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_DELETED', 'LEAVE_CREATED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'STAFF_CREATED', 'STAFF_UPDATED', 'STAFF_DEACTIVATED', 'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_DELETED', 'DEPARTMENT_HEAD_ASSIGNED', 'DEPARTMENT_HEAD_REMOVED', 'PROFESSION_CREATED', 'PROFESSION_UPDATED', 'PROFESSION_DEACTIVATED', 'SHIFT_TYPE_CREATED', 'SHIFT_TYPE_UPDATED', 'SHIFT_TYPE_DEACTIVATED', 'STAFFING_REQUIREMENT_CREATED', 'STAFFING_REQUIREMENT_UPDATED', 'STAFFING_REQUIREMENT_DELETED', 'SCHEDULING_POLICY_UPDATED', 'USER_INVITED', 'USER_UPDATED', 'USER_DEACTIVATED', 'MEMBERSHIP_ROLE_CHANGED', 'MEMBERSHIP_ACTIVATED', 'MEMBERSHIP_DEACTIVATED', 'ATTENDANCE_CLOCKED_IN', 'ATTENDANCE_CLOCKED_OUT', 'ATTENDANCE_CORRECTED', 'ATTENDANCE_APPROVED', 'ATTENDANCE_REJECTED', 'ATTENDANCE_VOIDED', 'ATTENDANCE_EXCEPTION_RESOLVED', 'ATTENDANCE_POLICY_UPDATED', 'ORGANIZATION_CREATED', 'ORGANIZATION_UPDATED', 'ORGANIZATION_SUSPENDED', 'ORGANIZATION_REACTIVATED', 'INVITATION_RESENT', 'INVITATION_REVOKED', 'INVITATION_ACCEPTED', 'ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DEACTIVATED', 'STAFF_ACCOUNT_LINKED', 'STAFF_ACCOUNT_UNLINKED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'auditEvent',
        constraint: 'auditEvent_entityType_check_a5d82518',
        expression:
          "\"entityType\" IN ('ROSTER', 'ASSIGNMENT', 'LEAVE_REQUEST', 'SHIFT_SWAP', 'STAFF', 'DEPARTMENT', 'PROFESSION', 'SHIFT_TYPE', 'STAFFING_REQUIREMENT', 'SCHEDULING_POLICY', 'USER', 'MEMBERSHIP', 'ATTENDANCE', 'ATTENDANCE_POLICY', 'ORGANIZATION', 'INVITATION', 'ROLE')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_entityType_check_bb9b415e',
        expression:
          "\"entityType\" IN ('LEAVE_REQUEST', 'SHIFT_SWAP', 'ROSTER', 'ATTENDANCE', 'ORGANIZATION_INVITATION')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_type_check_2949696f',
        expression:
          "\"type\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED', 'ATTENDANCE_CORRECTED', 'ATTENDANCE_APPROVED', 'ATTENDANCE_REJECTED', 'ORGANIZATION_INVITED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notificationDelivery',
        constraint: 'notificationDelivery_eventType_check_fb5469f3',
        expression:
          "\"eventType\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED', 'ATTENDANCE_CORRECTED', 'ATTENDANCE_APPROVED', 'ATTENDANCE_REJECTED', 'ORGANIZATION_INVITED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notificationOutbox',
        constraint: 'notificationOutbox_eventType_check_fb5469f3',
        expression:
          "\"eventType\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED', 'ATTENDANCE_CORRECTED', 'ATTENDANCE_APPROVED', 'ATTENDANCE_REJECTED', 'ORGANIZATION_INVITED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notificationPreference',
        constraint: 'notificationPreference_eventType_check_fb5469f3',
        expression:
          "\"eventType\" IN ('LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'SHIFT_SWAP_REQUESTED', 'SHIFT_SWAP_COMPLETED', 'SHIFT_SWAP_REJECTED', 'SHIFT_SWAP_CANCELLED', 'ROSTER_SUBMITTED_FOR_REVIEW', 'ROSTER_PUBLISHED', 'ROSTER_RETURNED_TO_DRAFT', 'ROSTER_AMENDMENT_CREATED', 'ATTENDANCE_CORRECTED', 'ATTENDANCE_APPROVED', 'ATTENDANCE_REJECTED', 'ORGANIZATION_INVITED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'organization',
        constraint: 'organization_organizationType_check_93b3d7c9',
        expression: "\"organizationType\" IN ('HOSPITAL', 'CLINIC', 'HEALTH_SYSTEM', 'OTHER')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'organizationInvitation',
        constraint: 'organizationInvitation_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organizationInvitation',
        index: 'organizationInvitation_acceptedByUserId_idx_5a9dcbb3',
        columns: ['acceptedByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organizationInvitation',
        index: 'organizationInvitation_invitedByUserId_idx_ad3f61d3',
        columns: ['invitedByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organizationInvitation',
        index: 'organizationInvitation_organizationId_email_status_idx_8f900090',
        columns: ['organizationId', 'email', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organizationInvitation',
        index: 'organizationInvitation_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organizationInvitation',
        index: 'organizationInvitation_organizationId_status_idx_21af5e82',
        columns: ['organizationId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organizationInvitation',
        index: 'organizationInvitation_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationInvitation',
        foreignKey: {
          name: 'organizationInvitation_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationInvitation',
        foreignKey: {
          name: 'organizationInvitation_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'role', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationInvitation',
        foreignKey: {
          name: 'organizationInvitation_invitedByUserId_fkey',
          columns: ['invitedByUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationInvitation',
        foreignKey: {
          name: 'organizationInvitation_acceptedByUserId_fkey',
          columns: ['acceptedByUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'organizationInvitation' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
