import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const migrationDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../migrations/app/20260906T1012_leave_requests",
)

describe("leave request migration", () => {
  it("creates the leaveRequest table with date-order and status checks", () => {
    const source = readFileSync(path.join(migrationDir, "migration.ts"), "utf8")
    const ops = JSON.parse(readFileSync(path.join(migrationDir, "ops.json"), "utf8")) as Array<{
      execute?: Array<{ sql?: string }>
    }>
    const sql = ops.flatMap((op) => op.execute ?? []).map((step) => step.sql ?? "").join("\n")

    expect(source).toContain("leaveRequest")
    expect(source).toContain('"startDate" <= "endDate"')
    expect(source).toContain("PENDING")
    expect(source).toContain("APPROVED")
    expect(source).not.toContain("DROP TABLE")

    expect(sql).toContain("CREATE TABLE \"public\".\"leaveRequest\"")
    expect(sql).toContain("leaveRequest_date_order")
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY")
  })
})
