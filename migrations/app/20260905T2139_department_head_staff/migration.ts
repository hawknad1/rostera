#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0701e758df582083c8ca05d5203b4a13b3fa8c504c183f09fcd2450e14d0b542/contract';
import endContract from '../../snapshots/0701e758df582083c8ca05d5203b4a13b3fa8c504c183f09fcd2450e14d0b542/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a38d4408a050914fc6388592a112c097363b8b312dae098fcd4996e22cf29e9a/contract';
import startContract from '../../snapshots/a38d4408a050914fc6388592a112c097363b8b312dae098fcd4996e22cf29e9a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addUnique({
        schema: 'public',
        table: 'department',
        constraint: 'department_headStaffId_key',
        columns: ['headStaffId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'department',
        foreignKey: {
          name: 'department_headStaffId_fkey',
          columns: ['headStaffId'],
          references: { schema: 'public', table: 'staffProfile', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
