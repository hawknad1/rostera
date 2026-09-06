import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const migrationDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../migrations/app/20260906T1508_notification_delivery",
)

describe("notification delivery migration", () => {
  it("adds delivery, preference, and receipt tables without dropping outbox data", () => {
    const source = readFileSync(path.join(migrationDir, "migration.ts"), "utf8")
    const ops = JSON.parse(readFileSync(path.join(migrationDir, "ops.json"), "utf8")) as Array<{
      execute?: Array<{ sql?: string }>
    }>
    const sql = ops.flatMap((op) => op.execute ?? []).map((step) => step.sql ?? "").join("\n")

    expect(source).toContain("notificationDelivery")
    expect(source).toContain("notificationPreference")
    expect(source).toContain("notificationDeliveryReceipt")
    expect(source).toContain("processingStartedAt")
    expect(source).not.toContain("DROP TABLE")

    expect(sql).toContain("notificationDelivery_idempotency_key")
    expect(sql).toContain("notificationPreference_key")
    expect(sql).toContain("notificationDeliveryReceipt_event_key")
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY")
    expect(sql).toContain('ADD COLUMN "processingStartedAt"')
    expect(sql).not.toContain("DROP TABLE")
  })
})
