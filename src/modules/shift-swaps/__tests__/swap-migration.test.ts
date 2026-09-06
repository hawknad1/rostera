import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const migrationDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../migrations/app/20260906T1115_shift_swap_requests",
)

describe("shift swap request migration", () => {
  it("creates the shiftSwapRequest table without weakening assignment constraints", () => {
    const source = readFileSync(path.join(migrationDir, "migration.ts"), "utf8")
    const ops = JSON.parse(readFileSync(path.join(migrationDir, "ops.json"), "utf8")) as Array<{
      execute?: Array<{ sql?: string }>
    }>
    const sql = ops.flatMap((op) => op.execute ?? []).map((step) => step.sql ?? "").join("\n")

    expect(source).toContain("shiftSwapRequest")
    expect(source).toContain("PENDING")
    expect(source).toContain("COMPLETED")
    expect(source).not.toContain("DROP TABLE")
    expect(source).not.toContain("shiftAssignment_staff_time_excl")
    expect(source).not.toContain("DROP CONSTRAINT")

    expect(sql).toContain("CREATE TABLE \"public\".\"shiftSwapRequest\"")
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY")
    expect(sql).not.toContain("DROP CONSTRAINT \"shiftAssignment_combo_key\"")
    expect(sql).not.toContain("DROP CONSTRAINT \"shiftAssignment_staff_time_excl\"")
  })
})
