import { createHmac } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { approveLeave, createLeave, getLeave } from "@/modules/leave/services/leave"
import { ChannelProviderError } from "@/modules/notifications/providers/errors"
import { setNotificationProvidersForTests } from "@/modules/notifications/providers/registry"
import type {
  ChannelSendInput,
  NotificationChannelProvider,
} from "@/modules/notifications/providers/types"
import { POST as drainPost } from "@/app/api/internal/notifications/drain/route"
import { POST as twilioWebhookPost } from "@/app/api/webhooks/twilio/status/route"
import { listNotificationDeliveries } from "@/modules/notifications/services/delivery-history"
import { enqueueNotificationEvent } from "@/modules/notifications/services/outbox"
import {
  getStaffNotificationPreferences,
  setStaffNotificationPreference,
} from "@/modules/notifications/services/preferences"
import { processOutboxEvent } from "@/modules/notifications/services/processor"
import { applyTwilioStatusCallback } from "@/modules/notifications/services/webhooks"
import { processNotificationDeliveries } from "@/modules/notifications/services/worker"
import { createAssignment } from "@/modules/rosters/services/assignments"
import { publishRoster, submitRosterForReview } from "@/modules/rosters/services/lifecycle"
import { createRoster, getRoster } from "@/modules/rosters/services/rosters"
import { db } from "@/prisma/db"

const AUTH_HR = "supabase-auth-hr"
const AUTH_STAFF = "supabase-auth-staff"
const AUTH_STAFF_B = "supabase-auth-staff-b"
const AUTH_ADMIN = "supabase-auth-admin"
const AUTH_MANAGER = "supabase-auth-manager"
const AUTH_B = "supabase-auth-org-b"

const USER_HR = "user-hr"
const USER_STAFF = "user-staff"
const USER_STAFF_B = "user-staff-b"
const USER_ADMIN = "user-admin"
const USER_MANAGER = "user-manager"
const USER_B = "user-b"

const ORG_A = "org-a"
const ORG_B = "org-b"

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

function authenticate(authProviderId: string) {
  getAuthUser.mockResolvedValue({ id: authProviderId })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

class MockProvider implements NotificationChannelProvider {
  sends: ChannelSendInput[] = []
  failWith: ChannelProviderError | null = null

  constructor(
    readonly channel: NotificationChannelProvider["channel"],
    readonly provider: NotificationChannelProvider["provider"],
  ) {}

  isConfigured() {
    return true
  }

  async send(input: ChannelSendInput) {
    if (this.failWith) {
      throw this.failWith
    }
    this.sends.push(input)
    return { providerMessageId: `${this.provider}-${this.sends.length}` }
  }
}

function seed() {
  memory.insert("Permission", { id: "perm-leave-view", key: permissions.leaveView })
  memory.insert("Permission", { id: "perm-leave-create", key: permissions.leaveCreate })
  memory.insert("Permission", { id: "perm-leave-approve", key: permissions.leaveApprove })
  memory.insert("Permission", { id: "perm-leave-reject", key: permissions.leaveReject })
  memory.insert("Permission", { id: "perm-roster-view", key: permissions.rosterView })
  memory.insert("Permission", { id: "perm-roster-create", key: permissions.rosterCreate })
  memory.insert("Permission", { id: "perm-roster-edit", key: permissions.rosterEdit })
  memory.insert("Permission", { id: "perm-roster-review", key: permissions.rosterReview })
  memory.insert("Permission", { id: "perm-roster-publish", key: permissions.rosterPublish })
  memory.insert("Permission", { id: "perm-notifications-view", key: permissions.notificationsView })

  memory.insert("Organization", { id: ORG_A, name: "Hospital A", slug: "hospital-a" })
  memory.insert("Organization", { id: ORG_B, name: "Hospital B", slug: "hospital-b" })

  memory.insert("User", {
    id: USER_HR,
    authProviderId: AUTH_HR,
    email: "hr@test.local",
    phone: "invalid-phone",
  })
  memory.insert("User", {
    id: USER_STAFF,
    authProviderId: AUTH_STAFF,
    email: "ama@test.local",
    phone: "0200000000",
  })
  memory.insert("User", {
    id: USER_STAFF_B,
    authProviderId: AUTH_STAFF_B,
    email: "kofi@test.local",
    phone: "233200000001",
  })
  memory.insert("User", { id: USER_ADMIN, authProviderId: AUTH_ADMIN, email: "admin@test.local" })
  memory.insert("User", { id: USER_MANAGER, authProviderId: AUTH_MANAGER, email: "mgr@test.local" })
  memory.insert("User", {
    id: USER_B,
    authProviderId: AUTH_B,
    email: "b@test.local",
    phone: "+233200000099",
  })

  memory.insert("Role", { id: "role-hr", organizationId: ORG_A, name: "HR" })
  memory.insert("Role", { id: "role-staff", organizationId: ORG_A, name: "STAFF" })
  memory.insert("Role", { id: "role-admin", organizationId: ORG_A, name: "SUPER_ADMIN" })
  memory.insert("Role", { id: "role-manager", organizationId: ORG_A, name: "ROSTER_MANAGER" })
  memory.insert("Role", { id: "role-b", organizationId: ORG_B, name: "HR" })

  grant("role-hr", "perm-leave-view")
  grant("role-hr", "perm-leave-create")
  grant("role-hr", "perm-leave-approve")
  grant("role-hr", "perm-leave-reject")
  grant("role-hr", "perm-notifications-view")
  grant("role-staff", "perm-leave-view")
  grant("role-staff", "perm-leave-create")
  grant("role-admin", "perm-leave-view")
  grant("role-admin", "perm-leave-create")
  grant("role-admin", "perm-leave-approve")
  grant("role-admin", "perm-notifications-view")
  grant("role-manager", "perm-roster-view")
  grant("role-manager", "perm-roster-create")
  grant("role-manager", "perm-roster-edit")
  grant("role-manager", "perm-roster-review")
  grant("role-manager", "perm-roster-publish")
  grant("role-b", "perm-leave-view")
  grant("role-b", "perm-leave-create")
  grant("role-b", "perm-leave-approve")
  grant("role-b", "perm-notifications-view")

  memory.insert("OrganizationMember", {
    id: "membership-hr",
    organizationId: ORG_A,
    userId: USER_HR,
    roleId: "role-hr",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-staff",
    organizationId: ORG_A,
    userId: USER_STAFF,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-staff-b",
    organizationId: ORG_A,
    userId: USER_STAFF_B,
    roleId: "role-staff",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-admin",
    organizationId: ORG_A,
    userId: USER_ADMIN,
    roleId: "role-admin",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-manager",
    organizationId: ORG_A,
    userId: USER_MANAGER,
    roleId: "role-manager",
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-b",
    organizationId: ORG_B,
    userId: USER_B,
    roleId: "role-b",
    status: "ACTIVE",
  })

  memory.insert("Profession", {
    id: "prof-nurse",
    organizationId: null,
    name: "Nurse",
    isActive: true,
  })
  memory.insert("Department", { id: "dept-a", organizationId: ORG_A, name: "Emergency" })
  memory.insert("Department", { id: "dept-b", organizationId: ORG_B, name: "Emergency" })
  memory.insert("StaffProfile", {
    id: "staff-ama",
    organizationId: ORG_A,
    userId: USER_STAFF,
    staffNumber: "NUR-001",
    firstName: "Ama",
    lastName: "Mensah",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
    phone: "0201111111",
  })
  memory.insert("StaffProfile", {
    id: "staff-kofi",
    organizationId: ORG_A,
    userId: USER_STAFF_B,
    staffNumber: "NUR-002",
    firstName: "Kofi",
    lastName: "Owusu",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
    phone: "+233200000001",
  })
  memory.insert("ShiftType", {
    id: "shift-day",
    organizationId: ORG_A,
    name: "Day",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })
}

beforeEach(() => {
  memory.reset()
  seed()
  setNotificationProvidersForTests(null)
})

afterEach(() => {
  setNotificationProvidersForTests(null)
  vi.unstubAllEnvs()
})

describe("phone and template safety", () => {
  it("normalizes E.164 without guessing a country code", async () => {
    const { normalizeE164 } = await import("@/modules/notifications/phone")
    expect(normalizeE164("+233200000001")).toBe("+233200000001")
    expect(normalizeE164("00 44 20 7946 0958")).toBe("+442079460958")
    expect(normalizeE164("0200000000")).toBeNull()
    expect(normalizeE164("233200000001")).toBeNull()
  })

  it("escapes untrusted values in email HTML", async () => {
    const { renderChannelContent } = await import("@/modules/notifications/templates/render")
    const rendered = renderChannelContent(
      {
        organizationId: ORG_A,
        eventId: "leave-1",
        type: "LEAVE_APPROVED",
        recipientUserId: USER_STAFF,
        title: "Leave <script>approved</script>",
        body: 'Hello "Ama" & friends',
      },
      "EMAIL",
    )
    expect(rendered.html).toContain("Leave &lt;script&gt;approved&lt;/script&gt;")
    expect(rendered.html).toContain("Hello &quot;Ama&quot; &amp; friends")
    expect(rendered.html).not.toContain("<script>")
  })
})

describe("channel delivery pipeline", () => {
  it("does not create duplicate deliveries when the outbox is processed twice", async () => {
    const email = new MockProvider("EMAIL", "RESEND")
    setNotificationProvidersForTests([email])

    await db.transaction(async (tx) => {
      await enqueueNotificationEvent(tx, {
        type: "LEAVE_APPROVED",
        organizationId: ORG_A,
        eventId: "leave-1",
        actorUserId: USER_HR,
        staffId: "staff-ama",
        staffName: "Ama Mensah",
        leaveTypeLabel: "annual",
        startDate: "2026-09-10",
        endDate: "2026-09-12",
      })
    })

    await processOutboxEvent({
      organizationId: ORG_A,
      eventType: "LEAVE_APPROVED",
      eventId: "leave-1",
    })
    await processOutboxEvent({
      organizationId: ORG_A,
      eventType: "LEAVE_APPROVED",
      eventId: "leave-1",
    })

    expect(
      memory.tables.NotificationDelivery.filter(
        (row) => row.channel === "EMAIL" && row.eventId === "leave-1",
      ),
    ).toHaveLength(1)
    expect(
      memory.tables.NotificationDelivery.filter((row) => row.channel === "IN_APP"),
    ).toHaveLength(1)
  })

  it("does not create an SMS delivery when the phone number is not E.164", async () => {
    const sms = new MockProvider("SMS", "TWILIO_SMS")
    setNotificationProvidersForTests([sms])

    await db.transaction(async (tx) => {
      await enqueueNotificationEvent(tx, {
        type: "LEAVE_APPROVED",
        organizationId: ORG_A,
        eventId: "leave-1",
        actorUserId: USER_HR,
        staffId: "staff-ama",
        staffName: "Ama Mensah",
        leaveTypeLabel: "annual",
        startDate: "2026-09-10",
        endDate: "2026-09-12",
      })
    })
    await processOutboxEvent({
      organizationId: ORG_A,
      eventType: "LEAVE_APPROVED",
      eventId: "leave-1",
    })

    expect(memory.tables.Notification.filter((row) => row.type === "LEAVE_APPROVED")).toHaveLength(1)
    expect(memory.tables.NotificationDelivery.filter((row) => row.channel === "SMS")).toHaveLength(0)
    expect(sms.sends).toHaveLength(0)
  })

  it("creates an SMS delivery for a valid E.164 number and sends once", async () => {
    const sms = new MockProvider("SMS", "TWILIO_SMS")
    setNotificationProvidersForTests([sms])

    await db.transaction(async (tx) => {
      await enqueueNotificationEvent(tx, {
        type: "LEAVE_APPROVED",
        organizationId: ORG_A,
        eventId: "leave-kofi",
        actorUserId: USER_HR,
        staffId: "staff-kofi",
        staffName: "Kofi Owusu",
        leaveTypeLabel: "annual",
        startDate: "2026-09-10",
        endDate: "2026-09-12",
      })
    })
    await processOutboxEvent({
      organizationId: ORG_A,
      eventType: "LEAVE_APPROVED",
      eventId: "leave-kofi",
    })
    await processNotificationDeliveries()
    await processNotificationDeliveries()

    expect(sms.sends).toHaveLength(1)
    expect(sms.sends[0]?.destination).toBe("+233200000001")
    expect(
      memory.tables.NotificationDelivery.find((row) => row.channel === "SMS")?.status,
    ).toBe("SENT")
  })

  it("schedules retry for a retryable provider failure and does not retry a permanent failure", async () => {
    const retryable = new MockProvider("EMAIL", "RESEND")
    retryable.failWith = new ChannelProviderError("TIMEOUT", true, "timeout")
    setNotificationProvidersForTests([retryable])

    await db.transaction(async (tx) => {
      await enqueueNotificationEvent(tx, {
        type: "LEAVE_APPROVED",
        organizationId: ORG_A,
        eventId: "leave-1",
        actorUserId: USER_HR,
        staffId: "staff-ama",
        staffName: "Ama Mensah",
        leaveTypeLabel: "annual",
        startDate: "2026-09-10",
        endDate: "2026-09-12",
      })
    })
    await processOutboxEvent({
      organizationId: ORG_A,
      eventType: "LEAVE_APPROVED",
      eventId: "leave-1",
    })
    await processNotificationDeliveries()

    const retried = memory.tables.NotificationDelivery.find((row) => row.channel === "EMAIL")
    expect(retried?.status).toBe("PENDING")
    expect(retried?.attemptCount).toBe(1)
    expect(retried?.lastError).toBe("Provider timeout")

    const permanent = new MockProvider("EMAIL", "RESEND")
    permanent.failWith = new ChannelProviderError("INVALID_DESTINATION", false, "bad dest")
    setNotificationProvidersForTests([permanent])
    memory.tables.NotificationDelivery.forEach((row) => {
      if (row.channel === "EMAIL") {
        row.availableAt = new Date(0).toISOString()
      }
    })
    await processNotificationDeliveries()
    expect(memory.tables.NotificationDelivery.find((row) => row.channel === "EMAIL")?.status).toBe(
      "FAILED",
    )
  })

  it("does not let two workers both send the same delivery", async () => {
    const email = new MockProvider("EMAIL", "RESEND")
    setNotificationProvidersForTests([email])
    await db.transaction(async (tx) => {
      await enqueueNotificationEvent(tx, {
        type: "LEAVE_APPROVED",
        organizationId: ORG_A,
        eventId: "leave-1",
        actorUserId: USER_HR,
        staffId: "staff-ama",
        staffName: "Ama Mensah",
        leaveTypeLabel: "annual",
        startDate: "2026-09-10",
        endDate: "2026-09-12",
      })
    })
    await processOutboxEvent({
      organizationId: ORG_A,
      eventType: "LEAVE_APPROVED",
      eventId: "leave-1",
    })

    await Promise.all([processNotificationDeliveries(), processNotificationDeliveries()])
    expect(email.sends).toHaveLength(1)
  })
})

describe("business transaction isolation from providers", () => {
  it("keeps leave approved when the email provider fails", async () => {
    const email = new MockProvider("EMAIL", "RESEND")
    email.failWith = new ChannelProviderError("PROVIDER_UNAVAILABLE", true, "down")
    setNotificationProvidersForTests([email])

    authenticate(AUTH_STAFF)
    const leave = await createLeave({
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })
    authenticate(AUTH_HR)
    const approved = await approveLeave(String(leave.id))

    expect(approved.status).toBe("APPROVED")
    await expect(getLeave(String(leave.id))).resolves.toMatchObject({ status: "APPROVED" })
    expect(memory.tables.Notification.filter((row) => row.type === "LEAVE_APPROVED")).toHaveLength(1)
    expect(
      memory.tables.NotificationDelivery.find((row) => row.channel === "EMAIL")?.status,
    ).toBe("PENDING")
  })

  it("keeps a roster published when SMS delivery fails", async () => {
    const sms = new MockProvider("SMS", "TWILIO_SMS")
    sms.failWith = new ChannelProviderError("TIMEOUT", true, "down")
    setNotificationProvidersForTests([sms])
    memory.tables.User.find((row) => row.id === USER_STAFF)!.phone = "+233200000010"

    authenticate(AUTH_MANAGER)
    const roster = await createRoster({
      name: "3 September — Emergency",
      departmentId: "dept-a",
      startDate: "2026-09-03",
      endDate: "2026-09-03",
    })
    await createAssignment({
      rosterId: roster.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-ama",
    })
    await submitRosterForReview(roster.id)
    const published = await publishRoster(roster.id)

    expect(published.status).toBe("PUBLISHED")
    await expect(getRoster(roster.id)).resolves.toMatchObject({ status: "PUBLISHED" })
    expect(memory.tables.Notification.filter((row) => row.type === "ROSTER_PUBLISHED")).toHaveLength(
      1,
    )
  })
})

describe("authorization, preferences, and webhooks", () => {
  it("keeps delivery history inside the active organization and away from staff", async () => {
    memory.insert("NotificationDelivery", {
      id: "d-a",
      organizationId: ORG_A,
      notificationOutboxId: "out-a",
      recipientUserId: USER_STAFF,
      eventType: "LEAVE_APPROVED",
      eventId: "leave-a",
      channel: "EMAIL",
      provider: "RESEND",
      status: "SENT",
      destination: "ama@test.local",
      templateKey: "rostera.leave_approved.email",
      attemptCount: 1,
    })
    memory.insert("NotificationDelivery", {
      id: "d-b",
      organizationId: ORG_B,
      notificationOutboxId: "out-b",
      recipientUserId: USER_B,
      eventType: "LEAVE_APPROVED",
      eventId: "leave-b",
      channel: "SMS",
      provider: "TWILIO_SMS",
      status: "SENT",
      destination: "+233200000099",
      templateKey: "rostera.leave_approved.sms",
      attemptCount: 1,
    })

    authenticate(AUTH_HR)
    const result = await listNotificationDeliveries()
    expect(result.items.map((row) => row.id)).toEqual(["d-a"])
    expect(result.items[0]?.destination).toBe("a***@test.local")
    expect(JSON.stringify(result)).not.toContain("TWILIO_AUTH_TOKEN")
    expect(JSON.stringify(result)).not.toContain("RESEND_API_KEY")

    authenticate(AUTH_STAFF)
    await expect(listNotificationDeliveries()).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("lets staff change only their own unlocked preferences", async () => {
    authenticate(AUTH_STAFF)
    await setStaffNotificationPreference({
      eventType: "LEAVE_CANCELLED",
      channel: "EMAIL",
      enabled: false,
    })
    await expect(
      setStaffNotificationPreference({
        eventType: "LEAVE_APPROVED",
        channel: "EMAIL",
        enabled: false,
      }),
    ).rejects.toMatchObject({ code: "PREFERENCE_LOCKED" })

    const prefs = await getStaffNotificationPreferences()
    const cancelled = prefs
      .flatMap((group) => group.events)
      .find((event) => event.type === "LEAVE_CANCELLED")
      ?.channels.find((channel) => channel.channel === "EMAIL")
    expect(cancelled?.enabled).toBe(false)

    authenticate(AUTH_STAFF_B)
    const other = await getStaffNotificationPreferences()
    const otherCancelled = other
      .flatMap((group) => group.events)
      .find((event) => event.type === "LEAVE_CANCELLED")
      ?.channels.find((channel) => channel.channel === "EMAIL")
    expect(otherCancelled?.enabled).toBe(true)
  })

  it("rejects unauthenticated Twilio webhooks and applies signed delivery receipts", async () => {
    memory.insert("NotificationDelivery", {
      id: "d-sms",
      organizationId: ORG_A,
      notificationOutboxId: "out-a",
      recipientUserId: USER_STAFF_B,
      eventType: "LEAVE_APPROVED",
      eventId: "leave-kofi",
      channel: "SMS",
      provider: "TWILIO_SMS",
      status: "SENT",
      destination: "+233200000001",
      templateKey: "rostera.leave_approved.sms",
      attemptCount: 1,
      providerMessageId: "SM123",
    })

    const unauthorized = await twilioWebhookPost(
      new Request("https://rostera.test/api/webhooks/twilio/status", {
        method: "POST",
        body: new URLSearchParams({ MessageSid: "SM123", MessageStatus: "delivered" }),
      }),
    )
    expect(unauthorized.status).toBe(401)
    expect(memory.tables.NotificationDelivery[0]?.status).toBe("SENT")

    vi.stubEnv("TWILIO_AUTH_TOKEN", "twilio-test-token")
    vi.stubEnv("TWILIO_STATUS_CALLBACK_URL", "https://rostera.test/api/webhooks/twilio/status")
    const params = { MessageSid: "SM123", MessageStatus: "delivered" }
    const url = "https://rostera.test/api/webhooks/twilio/status"
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key as keyof typeof params], url)
    const signature = createHmac("sha1", "twilio-test-token").update(data).digest("base64")
    const authorized = await twilioWebhookPost(
      new Request(url, {
        method: "POST",
        headers: { "X-Twilio-Signature": signature },
        body: new URLSearchParams(params),
      }),
    )
    expect(authorized.status).toBe(200)
    expect(memory.tables.NotificationDelivery[0]?.status).toBe("DELIVERED")

    await applyTwilioStatusCallback(params)
    expect(memory.tables.NotificationDeliveryReceipt).toHaveLength(1)
  })

  it("rejects an unauthenticated drain request", async () => {
    const response = await drainPost(
      new Request("https://rostera.test/api/internal/notifications/drain", { method: "POST" }),
    )
    expect(response.status).toBe(401)
  })
})
