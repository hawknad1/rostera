import { config } from "dotenv"
import pg from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

config({ path: ".env.local" })
config()

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL

const describeDb = connectionString ? describe : describe.skip

describeDb("shift assignment overlap exclusion in PostgreSQL", () => {
  let client: pg.Client
  let constraintDefinition = ""

  beforeAll(async () => {
    client = new pg.Client({ connectionString })
    await client.connect()

    const constraint = await client.query<{ definition: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS definition
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE c.conname = $1 AND t.relname = $2 AND n.nspname = $3`,
      ["shiftAssignment_staff_time_excl", "shiftAssignment", "public"],
    )

    constraintDefinition = constraint.rows[0]?.definition ?? ""
  })

  afterAll(async () => {
    await client.end()
  })

  it("has the live exclusion constraint with half-open tstzrange semantics", async () => {
    const extension = await client.query("SELECT 1 FROM pg_extension WHERE extname = $1", [
      "btree_gist",
    ])

    expect(extension.rowCount).toBe(1)
    expect(constraintDefinition).toContain("EXCLUDE USING gist")
    expect(constraintDefinition).toContain("staffId")
    expect(constraintDefinition).toContain("tstzrange")
    expect(constraintDefinition).toContain("[)")
  })

  it("rejects overlapping rows and allows adjacent and different-staff rows", async () => {
    expect(constraintDefinition.length).toBeGreaterThan(0)

    await client.query(`
      CREATE TEMP TABLE overlap_probe (
        id text PRIMARY KEY,
        "staffId" text NOT NULL,
        "startDateTime" timestamptz NOT NULL,
        "endDateTime" timestamptz NOT NULL,
        EXCLUDE USING gist (
          "staffId" WITH =,
          tstzrange("startDateTime", "endDateTime", '[)') WITH &&
        )
      )
    `)

    await client.query(
      `INSERT INTO overlap_probe (id, "staffId", "startDateTime", "endDateTime")
       VALUES ($1, $2, $3, $4)`,
      ["day", "staff-a", "2026-09-03T08:00:00Z", "2026-09-03T16:00:00Z"],
    )

    await expect(
      client.query(
        `INSERT INTO overlap_probe (id, "staffId", "startDateTime", "endDateTime")
         VALUES ($1, $2, $3, $4)`,
        ["overlap", "staff-a", "2026-09-03T15:59:00Z", "2026-09-03T22:00:00Z"],
      ),
    ).rejects.toMatchObject({ code: "23P01" })

    await client.query(
      `INSERT INTO overlap_probe (id, "staffId", "startDateTime", "endDateTime")
       VALUES ($1, $2, $3, $4)`,
      ["adjacent", "staff-a", "2026-09-03T16:00:00Z", "2026-09-04T00:00:00Z"],
    )

    await client.query(
      `INSERT INTO overlap_probe (id, "staffId", "startDateTime", "endDateTime")
       VALUES ($1, $2, $3, $4)`,
      ["night", "staff-b", "2026-09-03T22:00:00Z", "2026-09-04T06:00:00Z"],
    )

    await expect(
      client.query(
        `INSERT INTO overlap_probe (id, "staffId", "startDateTime", "endDateTime")
         VALUES ($1, $2, $3, $4)`,
        ["overnight-overlap", "staff-b", "2026-09-04T05:00:00Z", "2026-09-04T13:00:00Z"],
      ),
    ).rejects.toMatchObject({ code: "23P01" })

    await client.query(
      `INSERT INTO overlap_probe (id, "staffId", "startDateTime", "endDateTime")
       VALUES ($1, $2, $3, $4)`,
      ["next-day", "staff-b", "2026-09-04T08:00:00Z", "2026-09-04T16:00:00Z"],
    )

    await client.query(
      `INSERT INTO overlap_probe (id, "staffId", "startDateTime", "endDateTime")
       VALUES ($1, $2, $3, $4)`,
      ["other-staff", "staff-c", "2026-09-03T08:00:00Z", "2026-09-03T16:00:00Z"],
    )
  })
})
