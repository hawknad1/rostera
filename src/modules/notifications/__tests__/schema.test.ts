import { describe, expect, it } from "vitest"

import { notificationIntentSchema, notificationTypeSchema } from "@/modules/notifications/schemas/notification"
import { compactDateRange, notificationCopy } from "@/modules/notifications/copy"
import { notificationHref } from "@/modules/notifications/deep-links"

describe("notification types", () => {
  it("accepts the supported event types", () => {
    expect(notificationTypeSchema.parse("LEAVE_APPROVED")).toBe("LEAVE_APPROVED")
    expect(notificationTypeSchema.parse("ROSTER_PUBLISHED")).toBe("ROSTER_PUBLISHED")
  })

  it("rejects invalid notification types", () => {
    expect(notificationTypeSchema.safeParse("PAYROLL_READY").success).toBe(false)
    expect(notificationTypeSchema.safeParse("").success).toBe(false)
  })

  it("requires trusted intent fields", () => {
    const valid = {
      organizationId: "org-a",
      eventId: "leave-1",
      type: "LEAVE_APPROVED",
      recipientUserId: "user-staff",
      entityType: "LEAVE_REQUEST",
      entityId: "leave-1",
      title: "Leave approved",
      body: "Your annual leave request for Sep 10–12 has been approved.",
    }

    expect(notificationIntentSchema.parse(valid)).toMatchObject(valid)
    expect(
      notificationIntentSchema.safeParse({
        ...valid,
        recipientUserId: "",
      }).success,
    ).toBe(false)
    expect(
      notificationIntentSchema.safeParse({
        ...valid,
        type: "UNKNOWN",
      }).success,
    ).toBe(false)
  })
})

describe("notification copy and deep links", () => {
  it("formats compact leave ranges", () => {
    expect(compactDateRange("2026-09-10", "2026-09-12")).toBe("Sep 10–12")
    expect(compactDateRange("2026-09-10", "2026-09-10")).toBe("Sep 10")
  })

  it("builds approved-leave copy without internal ids", () => {
    const copy = notificationCopy({
      type: "LEAVE_APPROVED",
      organizationId: "org-a",
      eventId: "leave-1",
      actorUserId: "user-hr",
      staffId: "staff-ama",
      staffName: "Ama Mensah",
      leaveTypeLabel: "annual",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })

    expect(copy.title).toBe("Leave approved")
    expect(copy.body).toBe(
      "Your annual leave request for Sep 10–12 has been approved.",
    )
    expect(copy.body).not.toContain("leave-1")
  })

  it("maps entity references to existing routes", () => {
    expect(notificationHref("LEAVE_REQUEST", "leave-1")).toBe("/leave/leave-1")
    expect(notificationHref("SHIFT_SWAP", "swap-1")).toBe("/shift-swaps/swap-1")
    expect(notificationHref("ROSTER", "roster-1")).toBe("/rosters/roster-1")
  })
})
