import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const migrationDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../migrations/app/20260906T1550_attendance",
)

describe("attendance migration", () => {
  it("adds attendance tables without dropping existing data or overlap exclusions", () => {
    const source = readFileSync(path.join(migrationDir, "migration.ts"), "utf8")
    const ops = JSON.parse(readFileSync(path.join(migrationDir, "ops.json"), "utf8")) as Array<{
      execute?: Array<{ sql?: string }>
    }>
    const sql = ops.flatMap((op) => op.execute ?? []).map((step) => step.sql ?? "").join("\n")

    expect(source).toContain("attendanceRecord")
    expect(source).toContain("attendanceEvent")
    expect(source).toContain("attendanceException")
    expect(source).toContain("organizationAttendancePolicy")
    expect(source).toContain("attendanceRecord_open_session_key")
    expect(source).toContain("attendanceEvent_punch_key")
    expect(source).not.toContain("DROP TABLE")

    expect(sql).toContain("CREATE TABLE")
    expect(sql).toContain("attendanceRecord_open_session_key")
    expect(sql).toContain("attendanceEvent_punch_key")
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY")
    expect(sql).toContain("ATTENDANCE_CLOCKED_IN")
    expect(sql).not.toContain("DROP TABLE")
    expect(sql).not.toContain("shiftAssignment_staff_time_excl")
  })
})
