#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/aedb13f369679a2cb0300b54f92f0d88b46199498ed84491108241b61cddb498/contract';
import startContract from '../../snapshots/aedb13f369679a2cb0300b54f92f0d88b46199498ed84491108241b61cddb498/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8d89ae4b904c4ca01f78a560e804520bc34f9bd3535d1c107c119df9f724daf9/contract';
import endContract from '../../snapshots/8d89ae4b904c4ca01f78a560e804520bc34f9bd3535d1c107c119df9f724daf9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

const EXCLUSION_NAME = 'shiftAssignment_staff_time_excl';
const CONSTRAINT_EXISTS_SQL =
  'SELECT EXISTS (SELECT 1 AS "one" FROM "pg_constraint" AS "c" INNER JOIN "pg_namespace" AS "n" ON "n"."oid" = "c"."connamespace" WHERE ("c"."conname" = $1 AND "n"."nspname" = $2 AND "c"."conrelid" = to_regclass($3))) AS "result"';
const CONSTRAINT_ABSENT_SQL =
  'SELECT NOT EXISTS (SELECT 1 AS "one" FROM "pg_constraint" AS "c" INNER JOIN "pg_namespace" AS "n" ON "n"."oid" = "c"."connamespace" WHERE ("c"."conname" = $1 AND "n"."nspname" = $2 AND "c"."conrelid" = to_regclass($3))) AS "result"';
const EXCLUSION_PARAMS = [EXCLUSION_NAME, 'public', '"public"."shiftAssignment"'] as const;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addCheckConstraint({
        schema: 'public',
        table: 'shiftAssignment',
        constraint: 'shiftAssignment_window_order_78701f4f',
        expression: '"startDateTime" < "endDateTime"',
      }),
      rawSql({
        id: 'extension.btree_gist',
        label: 'Enable btree_gist for equality on text exclusion constraints',
        operationClass: 'additive',
        invariantId: 'rostera:btree_gist',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'create extension btree_gist in the extensions schema',
            sql: 'CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions',
          },
        ],
        postcheck: [
          {
            description: 'verify extension btree_gist is enabled',
            sql: "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') AS \"result\"",
          },
        ],
      }),
      rawSql({
        id: `exclusion.shiftAssignment.${EXCLUSION_NAME}`,
        label:
          'Prevent overlapping half-open assignment windows for the same staff member',
        operationClass: 'additive',
        invariantId: 'rostera:shiftAssignment_staff_time_excl',
        target: { id: 'postgres' },
        precheck: [
          {
            description: `ensure constraint "${EXCLUSION_NAME}" does not exist`,
            sql: CONSTRAINT_ABSENT_SQL,
            params: [...EXCLUSION_PARAMS],
          },
        ],
        execute: [
          {
            description: `add exclusion constraint "${EXCLUSION_NAME}"`,
            sql: `ALTER TABLE "public"."shiftAssignment" ADD CONSTRAINT "${EXCLUSION_NAME}" EXCLUDE USING gist ("staffId" WITH =, tstzrange("startDateTime", "endDateTime", '[)') WITH &&)`,
          },
        ],
        postcheck: [
          {
            description: `verify constraint "${EXCLUSION_NAME}" exists`,
            sql: CONSTRAINT_EXISTS_SQL,
            params: [...EXCLUSION_PARAMS],
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
