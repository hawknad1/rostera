import { Temporal } from "temporal-polyfill"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { selectCurrentPublishedRosters } from "@/modules/rosters/services/versions"
import {
  AUTH_STAFF,
  insertAssignment,
  insertPublishedRoster,
  seedStaffApp,
} from "@/modules/staff-app/__tests__/helpers"
import { getStaffHome } from "@/modules/staff-app/services/home"
import { getStaffPublishedRoster } from "@/modules/staff-app/services/roster"

const { getAuthUser } = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
}))

vi.mock("@/prisma/db", async () => {
  const { memory: testDb } = await import("@/lib/auth/__tests__/in-memory-orm")
  return { db: testDb.db }
})

vi.mock("@/lib/auth/get-auth-user", () => ({
  getAuthUser,
}))

beforeEach(() => {
  memory.reset()
  seedStaffApp()
  getAuthUser.mockResolvedValue({ id: AUTH_STAFF })
})

describe("staff published roster selection", () => {
  it("selects the current published version, not a higher draft", () => {
    const selected = selectCurrentPublishedRosters([
      { id: "v1", seriesId: "s", status: "PUBLISHED", versionNumber: 1 },
      { id: "v2", seriesId: "s", status: "DRAFT", versionNumber: 2 },
    ])

    expect(selected).toEqual([
      { id: "v1", seriesId: "s", status: "PUBLISHED", versionNumber: 1 },
    ])
  })

  it("ignores IN_REVIEW amendments", () => {
    const selected = selectCurrentPublishedRosters([
      { id: "v1", seriesId: "s", status: "PUBLISHED", versionNumber: 1 },
      { id: "v2", seriesId: "s", status: "IN_REVIEW", versionNumber: 2 },
    ])

    expect(selected.map((row) => row.id)).toEqual(["v1"])
  })

  it("uses the newest published version after an amendment is published", () => {
    const selected = selectCurrentPublishedRosters([
      { id: "v1", seriesId: "s", status: "PUBLISHED", versionNumber: 1 },
      { id: "v2", seriesId: "s", status: "PUBLISHED", versionNumber: 2 },
    ])

    expect(selected.map((row) => row.id)).toEqual(["v2"])
  })
})

describe("staff roster reads", () => {
  it("returns only the current published version and own assignments", async () => {
    insertPublishedRoster({ id: "roster-v1", seriesId: "series-ed", versionNumber: 1, status: "PUBLISHED" })
    insertPublishedRoster({ id: "roster-v2", seriesId: "series-ed", versionNumber: 2, status: "DRAFT" })
    insertAssignment({ id: "assign-v1", staffId: "staff-ama", rosterId: "roster-v1", date: "2026-09-10" })
    insertAssignment({ id: "assign-v2", staffId: "staff-ama", rosterId: "roster-v2", date: "2026-09-11" })
    insertAssignment({ id: "assign-kofi", staffId: "staff-kofi", rosterId: "roster-v1", date: "2026-09-10" })

    const result = await getStaffPublishedRoster(Temporal.Instant.from("2026-09-09T12:00:00Z"))

    expect(result.rosters.map((roster) => roster.id)).toEqual(["roster-v1"])
    expect(result.rosters[0]?.versionNumber).toBe(1)
    expect(result.assignments.map((row) => row.id)).toEqual(["assign-v1"])
  })

  it("does not show DRAFT or IN_REVIEW rosters", async () => {
    insertPublishedRoster({ id: "draft", status: "DRAFT", seriesId: "series-draft", versionNumber: 1 })
    insertAssignment({ id: "assign-draft", staffId: "staff-ama", rosterId: "draft", date: "2026-09-10" })
    insertPublishedRoster({
      id: "review",
      status: "IN_REVIEW",
      seriesId: "series-review",
      versionNumber: 1,
    })
    insertAssignment({ id: "assign-review", staffId: "staff-ama", rosterId: "review", date: "2026-09-11" })

    const result = await getStaffPublishedRoster()
    expect(result.rosters).toEqual([])
    expect(result.assignments).toEqual([])
  })

  it("switches to the new published version without merging historical assignments", async () => {
    insertPublishedRoster({ id: "roster-v1", seriesId: "series-ed", versionNumber: 1, status: "PUBLISHED" })
    insertPublishedRoster({ id: "roster-v2", seriesId: "series-ed", versionNumber: 2, status: "PUBLISHED" })
    insertAssignment({ id: "assign-v1", staffId: "staff-ama", rosterId: "roster-v1", date: "2026-09-10" })
    insertAssignment({ id: "assign-v2", staffId: "staff-ama", rosterId: "roster-v2", date: "2026-09-12" })

    const result = await getStaffPublishedRoster()
    expect(result.rosters.map((roster) => roster.id)).toEqual(["roster-v2"])
    expect(result.assignments.map((row) => row.id)).toEqual(["assign-v2"])
  })

  it("summarizes the next published shift on home", async () => {
    insertPublishedRoster()
    insertAssignment({ id: "assign-ama", staffId: "staff-ama", rosterId: "roster-v1", date: "2026-09-10" })

    const home = await getStaffHome(Temporal.Instant.from("2026-09-09T12:00:00Z"))
    expect(home.nextShift?.id).toBe("assign-ama")
    expect(home.nextShift?.shiftTypeName).toBe("Day Duty")
    expect(home.currentRoster?.versionNumber).toBe(1)
  })
})
