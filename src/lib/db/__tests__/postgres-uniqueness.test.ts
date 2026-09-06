import { config } from "dotenv"
import pg from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

config({ path: ".env.local" })
config()

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
const describeDb = connectionString ? describe : describe.skip

describeDb("PostgreSQL uniqueness probes for concurrency invariants", () => {
  let client: pg.Client

  beforeAll(async () => {
    client = new pg.Client({ connectionString })
    await client.connect()
  })

  afterAll(async () => {
    await client.end()
  })

  it("rejects a second open attendance session for the same staff", async () => {
    await client.query(`
      CREATE TEMP TABLE attendance_open_probe (
        id text PRIMARY KEY,
        "organizationId" text NOT NULL,
        "staffId" text NOT NULL,
        "openSessionKey" text,
        UNIQUE ("organizationId", "staffId", "openSessionKey")
      )
    `)

    await client.query(
      `INSERT INTO attendance_open_probe VALUES ($1, $2, $3, $4)`,
      ["open-1", "org-a", "staff-a", "OPEN"],
    )

    await expect(
      client.query(`INSERT INTO attendance_open_probe VALUES ($1, $2, $3, $4)`, [
        "open-2",
        "org-a",
        "staff-a",
        "OPEN",
      ]),
    ).rejects.toMatchObject({ code: "23505" })

    await client.query(`INSERT INTO attendance_open_probe VALUES ($1, $2, $3, $4)`, [
      "closed-1",
      "org-a",
      "staff-a",
      null,
    ])
    await client.query(`INSERT INTO attendance_open_probe VALUES ($1, $2, $3, $4)`, [
      "closed-2",
      "org-a",
      "staff-a",
      null,
    ])
  })

  it("rejects duplicate memberships and invitation token hashes", async () => {
    await client.query(`
      CREATE TEMP TABLE membership_probe (
        id text PRIMARY KEY,
        "organizationId" text NOT NULL,
        "userId" text NOT NULL,
        UNIQUE ("organizationId", "userId")
      )
    `)
    await client.query(`
      CREATE TEMP TABLE invitation_probe (
        id text PRIMARY KEY,
        "tokenHash" text NOT NULL UNIQUE
      )
    `)

    await client.query(`INSERT INTO membership_probe VALUES ($1, $2, $3)`, [
      "mem-1",
      "org-a",
      "user-a",
    ])
    await expect(
      client.query(`INSERT INTO membership_probe VALUES ($1, $2, $3)`, [
        "mem-2",
        "org-a",
        "user-a",
      ]),
    ).rejects.toMatchObject({ code: "23505" })

    await client.query(`INSERT INTO invitation_probe VALUES ($1, $2)`, ["inv-1", "hash-a"])
    await expect(
      client.query(`INSERT INTO invitation_probe VALUES ($1, $2)`, ["inv-2", "hash-a"]),
    ).rejects.toMatchObject({ code: "23505" })
  })

  it("rejects duplicate notification outbox and delivery receipt keys", async () => {
    await client.query(`
      CREATE TEMP TABLE outbox_probe (
        id text PRIMARY KEY,
        "organizationId" text NOT NULL,
        "eventType" text NOT NULL,
        "eventId" text NOT NULL,
        UNIQUE ("organizationId", "eventType", "eventId")
      )
    `)
    await client.query(`
      CREATE TEMP TABLE receipt_probe (
        id text PRIMARY KEY,
        "organizationId" text NOT NULL,
        provider text NOT NULL,
        "providerEventId" text NOT NULL,
        UNIQUE ("organizationId", provider, "providerEventId")
      )
    `)

    await client.query(`INSERT INTO outbox_probe VALUES ($1, $2, $3, $4)`, [
      "out-1",
      "org-a",
      "LEAVE_APPROVED",
      "leave-1",
    ])
    await expect(
      client.query(`INSERT INTO outbox_probe VALUES ($1, $2, $3, $4)`, [
        "out-2",
        "org-a",
        "LEAVE_APPROVED",
        "leave-1",
      ]),
    ).rejects.toMatchObject({ code: "23505" })

    await client.query(`INSERT INTO receipt_probe VALUES ($1, $2, $3, $4)`, [
      "rcpt-1",
      "org-a",
      "TWILIO",
      "SM123:delivered",
    ])
    await expect(
      client.query(`INSERT INTO receipt_probe VALUES ($1, $2, $3, $4)`, [
        "rcpt-2",
        "org-a",
        "TWILIO",
        "SM123:delivered",
      ]),
    ).rejects.toMatchObject({ code: "23505" })
  })
})
