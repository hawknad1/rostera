import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { AuditError } from "@/modules/audit/errors"
import { parseAuditMetadata } from "@/modules/audit/sanitize"
import { recordAuditEvent } from "@/modules/audit/services/record"
import * as auditQueries from "@/modules/audit/services/audit"
import * as auditRecord from "@/modules/audit/services/record"
import { db } from "@/prisma/db"

const ORG_A = "org-a"
const ORG_B = "org-b"
const USER_A = "user-a"

vi.mock("@/prisma/db", async () => {
  const { memory: testDb } = await import("@/lib/auth/__tests__/in-memory-orm")
  return { db: testDb.db }
})

describe("recordAuditEvent", () => {
  beforeEach(() => {
    memory.reset()
    memory.insert("Organization", { id: ORG_A, name: "Hospital A", slug: "hospital-a" })
    memory.insert("Organization", { id: ORG_B, name: "Hospital B", slug: "hospital-b" })
    memory.insert("User", { id: USER_A, authProviderId: "auth-a", email: "a@test.local" })
  })

  it("creates a USER audit event with trusted actor, summary, and metadata", async () => {
    const row = await db.transaction(async (tx) =>
      recordAuditEvent(tx, {
        actor: {
          type: "USER",
          userId: USER_A,
          organizationId: ORG_A,
          membershipId: "membership-a",
        },
        action: "ROSTER_CREATED",
        entityType: "ROSTER",
        entityId: "roster-1",
        summary: 'Created roster "September Nursing Roster".',
        metadata: {
          after: { status: "DRAFT", password: "should-not-persist" },
        },
      }),
    )

    expect(row.organizationId).toBe(ORG_A)
    expect(row.actorType).toBe("USER")
    expect(row.actorUserId).toBe(USER_A)
    expect(row.actorMembershipId).toBe("membership-a")
    expect(row.action).toBe("ROSTER_CREATED")
    expect(row.entityType).toBe("ROSTER")
    expect(row.entityId).toBe("roster-1")
    expect(row.eventId).toBe("ROSTER_CREATED:roster-1")
    expect(row.summary).toBe('Created roster "September Nursing Roster".')
    expect(parseAuditMetadata(row.metadata)).toMatchObject({
      after: { status: "DRAFT", password: "[redacted]" },
    })
    expect(String(row.metadata)).not.toContain("should-not-persist")
  })

  it("creates a SYSTEM audit event without fabricating a user", async () => {
    const row = await db.transaction(async (tx) =>
      recordAuditEvent(tx, {
        actor: { type: "SYSTEM", organizationId: ORG_A },
        action: "SCHEDULING_POLICY_UPDATED",
        entityType: "SCHEDULING_POLICY",
        entityId: "policy-1",
        summary: "Updated scheduling policy.",
      }),
    )

    expect(row.actorType).toBe("SYSTEM")
    expect(row.actorUserId).toBeUndefined()
    expect(row.organizationId).toBe(ORG_A)
    expect(memory.tables.User).toHaveLength(1)
  })

  it("rejects an incomplete USER actor", async () => {
    await expect(
      db.transaction(async (tx) =>
        recordAuditEvent(tx, {
          actor: { type: "USER", userId: "", organizationId: ORG_A },
          action: "ROSTER_CREATED",
          entityType: "ROSTER",
          entityId: "roster-1",
          summary: "Created roster.",
        }),
      ),
    ).rejects.toBeInstanceOf(AuditError)
  })

  it("preserves tenant on the stored row", async () => {
    await db.transaction(async (tx) =>
      recordAuditEvent(tx, {
        actor: { type: "USER", userId: USER_A, organizationId: ORG_B },
        action: "DEPARTMENT_CREATED",
        entityType: "DEPARTMENT",
        entityId: "dept-1",
        summary: "Created department.",
      }),
    )

    expect(memory.tables.AuditEvent[0]?.organizationId).toBe(ORG_B)
  })

  it("rejects a duplicate one-shot event identity", async () => {
    await db.transaction(async (tx) =>
      recordAuditEvent(tx, {
        actor: { type: "USER", userId: USER_A, organizationId: ORG_A },
        action: "ROSTER_PUBLISHED",
        entityType: "ROSTER",
        entityId: "roster-1",
        summary: "Published roster.",
      }),
    )

    await expect(
      db.transaction(async (tx) =>
        recordAuditEvent(tx, {
          actor: { type: "USER", userId: USER_A, organizationId: ORG_A },
          action: "ROSTER_PUBLISHED",
          entityType: "ROSTER",
          entityId: "roster-1",
          summary: "Published roster.",
        }),
      ),
    ).rejects.toSatisfy((error) => isUniqueConstraintViolation(error))

    expect(memory.tables.AuditEvent).toHaveLength(1)
  })

  it("allows two genuine update actions on the same entity", async () => {
    await db.transaction(async (tx) =>
      recordAuditEvent(tx, {
        actor: { type: "USER", userId: USER_A, organizationId: ORG_A },
        action: "ROSTER_UPDATED",
        entityType: "ROSTER",
        entityId: "roster-1",
        summary: "Updated roster.",
      }),
    )
    await db.transaction(async (tx) =>
      recordAuditEvent(tx, {
        actor: { type: "USER", userId: USER_A, organizationId: ORG_A },
        action: "ROSTER_UPDATED",
        entityType: "ROSTER",
        entityId: "roster-1",
        summary: "Updated roster.",
      }),
    )

    expect(memory.tables.AuditEvent).toHaveLength(2)
    expect(memory.tables.AuditEvent[0]?.eventId).not.toBe(memory.tables.AuditEvent[1]?.eventId)
  })

  it("does not expose update or delete operations", () => {
    expect(auditRecord).not.toHaveProperty("updateAuditEvent")
    expect(auditRecord).not.toHaveProperty("deleteAuditEvent")
    expect(auditQueries).not.toHaveProperty("updateAuditEvent")
    expect(auditQueries).not.toHaveProperty("deleteAuditEvent")
    expect(typeof auditRecord.recordAuditEvent).toBe("function")
    expect(typeof auditQueries.listAuditEvents).toBe("function")
    expect(typeof auditQueries.getAuditEvent).toBe("function")
  })
})
