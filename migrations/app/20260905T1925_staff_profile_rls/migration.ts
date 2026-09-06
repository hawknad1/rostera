#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/51b66858ee4c4a5ed828c2c344497014ed744e2bb494414bb0f79afd986ab319/contract';
import startContract from '../../snapshots/51b66858ee4c4a5ed828c2c344497014ed744e2bb494414bb0f79afd986ab319/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a38d4408a050914fc6388592a112c097363b8b312dae098fcd4996e22cf29e9a/contract';
import endContract from '../../snapshots/a38d4408a050914fc6388592a112c097363b8b312dae098fcd4996e22cf29e9a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'staffProfile',
        constraint: 'staffProfile_userId_key',
      }),
      this.addUnique({
        schema: 'public',
        table: 'staffProfile',
        constraint: 'staffProfile_organizationId_userId_key',
        columns: ['organizationId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'staffProfile',
        index: 'staffProfile_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'department' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'organization' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'organizationMember' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'permission' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'profession' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'role' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'rolePermission' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'staffProfile' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'user' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
