import { describe, expect, it } from "vitest"

import { diffAssignmentSnapshots } from "@/modules/rosters/services/compare"

function assignment(
  id: string,
  extras: Partial<{
    staffId: string
    shiftTypeId: string
    date: string
    copiedFromAssignmentId: string | null
    shiftStartTime: string
    shiftEndTime: string
  }> = {},
) {
  return {
    id,
    staffId: extras.staffId ?? "staff-ama",
    shiftTypeId: extras.shiftTypeId ?? "shift-day",
    date: extras.date ?? "2026-09-03",
    shiftStartTime: extras.shiftStartTime ?? "08:00",
    shiftEndTime: extras.shiftEndTime ?? "16:00",
    isOvernight: false,
    startDateTime: "2026-09-03T08:00:00Z",
    endDateTime: "2026-09-03T16:00:00Z",
    copiedFromAssignmentId: extras.copiedFromAssignmentId,
  }
}

describe("assignment version comparison", () => {
  it("treats copied lineage with the same snapshot as unchanged", () => {
    const diff = diffAssignmentSnapshots(
      [assignment("a1")],
      [assignment("a1-copy", { copiedFromAssignmentId: "a1" })],
    )

    expect(diff.added).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
    expect(diff.changed).toHaveLength(0)
    expect(diff.unchangedCount).toBe(1)
  })

  it("detects added and removed assignments", () => {
    const diff = diffAssignmentSnapshots(
      [assignment("a1"), assignment("a2", { staffId: "staff-kofi" })],
      [assignment("a1-copy", { copiedFromAssignmentId: "a1" }), assignment("a3", { date: "2026-09-04" })],
    )

    expect(diff.removed.map((row) => row.id)).toEqual(["a2"])
    expect(diff.added.map((row) => row.id)).toEqual(["a3"])
  })

  it("detects changed staff on a copied assignment", () => {
    const diff = diffAssignmentSnapshots(
      [assignment("a1")],
      [assignment("a1-copy", { copiedFromAssignmentId: "a1", staffId: "staff-kofi" })],
    )

    expect(diff.changed).toHaveLength(1)
    expect(diff.changed[0]?.changedFields).toEqual(["staff"])
  })

  it("detects a shift type change for the same staff and date", () => {
    const diff = diffAssignmentSnapshots(
      [assignment("a1")],
      [assignment("a2", { shiftTypeId: "shift-late" })],
    )

    expect(diff.changed).toHaveLength(1)
    expect(diff.changed[0]?.changedFields).toContain("shift")
  })
})
