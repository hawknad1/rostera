import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const migrationDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../migrations/app/20260906T0057_shift_assignment_staff_overlap_excl",
)

describe("shift assignment staff overlap exclusion migration", () => {
  it("installs btree_gist and a half-open gist exclusion on staff time windows", () => {
    const source = readFileSync(path.join(migrationDir, "migration.ts"), "utf8")
    const ops = JSON.parse(readFileSync(path.join(migrationDir, "ops.json"), "utf8")) as Array<{
      execute?: Array<{ sql?: string }>
    }>
    const sql = ops.flatMap((op) => op.execute ?? []).map((step) => step.sql ?? "").join("\n")

    expect(source).toContain("CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions")
    expect(source).toContain("EXCLUDE USING gist")
    expect(source).toContain('"staffId" WITH =')
    expect(source).toContain('tstzrange("startDateTime", "endDateTime", \'[)\') WITH &&')
    expect(source).not.toContain("DROP CONSTRAINT")

    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions")
    expect(sql).toContain("EXCLUDE USING gist")
    expect(sql).toContain('"staffId" WITH =')
    expect(sql).toContain('tstzrange("startDateTime", "endDateTime", \'[)\') WITH &&')
    expect(sql).toContain("shiftAssignment_staff_time_excl")
    expect(sql).not.toContain("DROP CONSTRAINT \"shiftAssignment_combo_key\"")
  })
})
