import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const migrationDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../migrations/app/20260906T1356_roster_amendments",
)

describe("roster versioning migration", () => {
  it("adds series/version columns and a roster-scoped overlap exclusion", () => {
    const source = readFileSync(path.join(migrationDir, "migration.ts"), "utf8")
    const ops = JSON.parse(readFileSync(path.join(migrationDir, "ops.json"), "utf8")) as Array<{
      execute?: Array<{ sql?: string }>
    }>
    const sql = ops.flatMap((op) => op.execute ?? []).map((step) => step.sql ?? "").join("\n")

    expect(source).toContain("seriesId")
    expect(source).toContain("versionNumber")
    expect(source).toContain("parentRosterId")
    expect(source).toContain("copiedFromAssignmentId")
    expect(source).toContain("shiftAssignment_staff_roster_time_excl")
    expect(source).toContain('"rosterId" WITH =')

    expect(sql).toContain("seriesId")
    expect(sql).toContain("versionNumber")
    expect(sql).toContain("roster_series_version_key")
    expect(sql).toContain("ROSTER_AMENDMENT_CREATED")
    expect(sql).toContain("shiftAssignment_staff_roster_time_excl")
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS \"shiftAssignment_staff_time_excl\"")
  })
})
