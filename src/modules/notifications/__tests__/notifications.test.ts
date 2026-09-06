import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createLeave, approveLeave, rejectLeave, cancelLeave } from "@/modules/leave/services/leave"
import { getLeave } from "@/modules/leave/services/leave"
import { inAppChannel } from "@/modules/notifications/adapters/in-app"
import { notificationHref } from "@/modules/notifications/deep-links"
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/modules/notifications/services/notifications"
import { processOutboxEvent } from "@/modules/notifications/services/processor"
import { enqueueNotificationEvent } from "@/modules/notifications/services/outbox"
import { db } from "@/prisma/db"

const AUTH_HR = "supabase-auth-hr"
const AUTH_STAFF = "supabase-auth-staff"
const AUTH_STAFF_B = "supabase-auth-staff-b"
const AUTH_ADMIN = "supabase-auth-admin"
const AUTH_B = "supabase-auth-org-b"

const USER_HR = "user-hr"
const USER_STAFF = "user-staff"
const USER_STAFF_B = "user-staff-b"
const USER_ADMIN = "user-admin"
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

function seed() {
  memory.insert("Permission", { id: "perm-leave-view", key: permissions.leaveView })
  memory.insert("Permission", { id: "perm-leave-create", key: permissions.leaveCreate })
  memory.insert("Permission", { id: "perm-leave-approve", key: permissions.leaveApprove })
  memory.insert("Permission", { id: "perm-leave-reject", key: permissions.leaveReject })

  memory.insert("Organization", { id: ORG_A, name: "Hospital A", slug: "hospital-a" })
  memory.insert("Organization", { id: ORG_B, name: "Hospital B", slug: "hospital-b" })

  memory.insert("User", { id: USER_HR, authProviderId: AUTH_HR, email: "hr@test.local" })
  memory.insert("User", { id: USER_STAFF, authProviderId: AUTH_STAFF, email: "ama@test.local" })
  memory.insert("User", { id: USER_STAFF_B, authProviderId: AUTH_STAFF_B, email: "kofi@test.local" })
  memory.insert("User", { id: USER_ADMIN, authProviderId: AUTH_ADMIN, email: "admin@test.local" })
  memory.insert("User", { id: USER_B, authProviderId: AUTH_B, email: "b@test.local" })

  memory.insert("Role", { id: "role-hr", organizationId: ORG_A, name: "HR" })
  memory.insert("Role", { id: "role-staff", organizationId: ORG_A, name: "STAFF" })
  memory.insert("Role", { id: "role-admin", organizationId: ORG_A, name: "SUPER_ADMIN" })
  memory.insert("Role", { id: "role-b", organizationId: ORG_B, name: "HR" })

  grant("role-hr", "perm-leave-view")
  grant("role-hr", "perm-leave-create")
  grant("role-hr", "perm-leave-approve")
  grant("role-hr", "perm-leave-reject")
  grant("role-staff", "perm-leave-view")
  grant("role-staff", "perm-leave-create")
  grant("role-admin", "perm-leave-view")
  grant("role-admin", "perm-leave-create")
  grant("role-admin", "perm-leave-approve")
  grant("role-b", "perm-leave-view")
  grant("role-b", "perm-leave-create")
  grant("role-b", "perm-leave-approve")
  grant("role-b", "perm-leave-reject")

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
  })
  memory.insert("StaffProfile", {
    id: "staff-unlinked",
    organizationId: ORG_A,
    staffNumber: "NUR-003",
    firstName: "Efua",
    lastName: "Boateng",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-b",
    organizationId: ORG_B,
    userId: USER_B,
    staffNumber: "NUR-001",
    firstName: "Abena",
    lastName: "Sarpong",
    professionId: "prof-nurse",
    departmentId: "dept-b",
    employmentStatus: "ACTIVE",
  })
}

beforeEach(() => {
  memory.reset()
  seed()
})

describe("notification authorization and read state", () => {
  it("lets a user see only their own notifications in the active organization", async () => {
    memory.insert("Notification", {
      id: "n-staff",
      organizationId: ORG_A,
      recipientUserId: USER_STAFF,
      type: "LEAVE_APPROVED",
      title: "Leave approved",
      body: "Your leave was approved.",
      entityType: "LEAVE_REQUEST",
      entityId: "leave-1",
      eventId: "leave-1",
      readAt: null,
      createdAt: "2026-09-06T10:00:00.000Z",
    })
    memory.insert("Notification", {
      id: "n-hr",
      organizationId: ORG_A,
      recipientUserId: USER_HR,
      type: "LEAVE_REQUESTED",
      title: "Leave requested",
      body: "Ama Mensah requested leave.",
      entityType: "LEAVE_REQUEST",
      entityId: "leave-1",
      eventId: "leave-1",
      readAt: null,
      createdAt: "2026-09-06T11:00:00.000Z",
    })
    memory.insert("Notification", {
      id: "n-cross",
      organizationId: ORG_B,
      recipientUserId: USER_STAFF,
      type: "LEAVE_APPROVED",
      title: "Other org",
      body: "Should not leak.",
      eventId: "leave-b",
      readAt: null,
      createdAt: "2026-09-06T12:00:00.000Z",
    })

    authenticate(AUTH_STAFF)
    const result = await listNotifications()

    expect(result.items.map((row) => row.id)).toEqual(["n-staff"])
    expect(result.unreadCount).toBe(1)
  })

  it("does not let a user mark another user's notification read", async () => {
    memory.insert("Notification", {
      id: "n-hr",
      organizationId: ORG_A,
      recipientUserId: USER_HR,
      type: "LEAVE_REQUESTED",
      title: "Leave requested",
      body: "Ama Mensah requested leave.",
      eventId: "leave-1",
      readAt: null,
    })

    authenticate(AUTH_STAFF)
    await expect(markNotificationRead("n-hr")).rejects.toMatchObject({
      code: "NOTIFICATION_NOT_FOUND",
    })
    expect(memory.tables.Notification[0]?.readAt).toBeNull()
  })

  it("marks one notification read and unread for the current user", async () => {
    memory.insert("Notification", {
      id: "n-staff",
      organizationId: ORG_A,
      recipientUserId: USER_STAFF,
      type: "LEAVE_APPROVED",
      title: "Leave approved",
      body: "Your leave was approved.",
      eventId: "leave-1",
      readAt: null,
    })

    authenticate(AUTH_STAFF)
    const read = await markNotificationRead("n-staff")
    expect(read.readAt).toBeTruthy()

    const unread = await markNotificationUnread("n-staff")
    expect(unread.readAt).toBeNull()
  })

  it("marks all of the current user's notifications read", async () => {
    memory.insert("Notification", {
      id: "n-1",
      organizationId: ORG_A,
      recipientUserId: USER_STAFF,
      type: "LEAVE_APPROVED",
      title: "Leave approved",
      body: "One",
      eventId: "leave-1",
      readAt: null,
    })
    memory.insert("Notification", {
      id: "n-2",
      organizationId: ORG_A,
      recipientUserId: USER_STAFF,
      type: "LEAVE_REJECTED",
      title: "Leave rejected",
      body: "Two",
      eventId: "leave-2",
      readAt: null,
    })
    memory.insert("Notification", {
      id: "n-hr",
      organizationId: ORG_A,
      recipientUserId: USER_HR,
      type: "LEAVE_REQUESTED",
      title: "Leave requested",
      body: "Other user",
      eventId: "leave-3",
      readAt: null,
    })

    authenticate(AUTH_STAFF)
    await markAllNotificationsRead()

    expect(memory.tables.Notification.find((row) => row.id === "n-1")?.readAt).toBeTruthy()
    expect(memory.tables.Notification.find((row) => row.id === "n-2")?.readAt).toBeTruthy()
    expect(memory.tables.Notification.find((row) => row.id === "n-hr")?.readAt).toBeNull()
  })
})

describe("idempotency and outbox", () => {
  it("uses the database unique key so the same event is not delivered twice", async () => {
    const channel = inAppChannel(db.orm)
    const intent = {
      organizationId: ORG_A,
      eventId: "leave-1",
      type: "LEAVE_APPROVED" as const,
      recipientUserId: USER_STAFF,
      entityType: "LEAVE_REQUEST" as const,
      entityId: "leave-1",
      title: "Leave approved",
      body: "Your annual leave request for Sep 10–12 has been approved.",
    }

    await expect(channel.deliver(intent)).resolves.toMatchObject({ delivered: true })
    await expect(channel.deliver(intent)).resolves.toMatchObject({ skipped: true })
    expect(memory.tables.Notification).toHaveLength(1)
  })

  it("does not duplicate notifications when the outbox is processed twice", async () => {
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
      memory.tables.Notification.filter(
        (row) => row.type === "LEAVE_APPROVED" && row.eventId === "leave-1",
      ),
    ).toHaveLength(1)
    expect(memory.tables.NotificationOutbox[0]?.status).toBe("COMPLETED")
  })

  it("keeps a failed outbox row for later retry", async () => {
    memory.failNextCreate("Notification")

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

    const result = await processOutboxEvent({
      organizationId: ORG_A,
      eventType: "LEAVE_APPROVED",
      eventId: "leave-1",
    })

    expect(result.status).toBe("PENDING")
    expect(memory.tables.NotificationOutbox[0]?.status).toBe("PENDING")
    expect(memory.tables.NotificationOutbox[0]?.lastError).toBe(
      "Unable to deliver in-app notification.",
    )
    expect(memory.tables.NotificationOutbox[0]?.attempts).toBe(1)
  })
})

describe("leave notification integration", () => {
  it("notifies HR when staff request leave, not SUPER_ADMIN by default", async () => {
    authenticate(AUTH_STAFF)
    const leave = await createLeave({
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })

    const requested = memory.tables.Notification.filter((row) => row.type === "LEAVE_REQUESTED")
    expect(requested.map((row) => row.recipientUserId)).toEqual([USER_HR])
    expect(requested[0]?.entityId).toBe(leave.id)
    expect(notificationHref("LEAVE_REQUEST", String(leave.id))).toBe(`/leave/${leave.id}`)
  })

  it("notifies the linked staff user on approval, rejection, and reviewer cancellation", async () => {
    authenticate(AUTH_STAFF)
    const approved = await createLeave({
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })
    authenticate(AUTH_HR)
    await approveLeave(String(approved.id))

    authenticate(AUTH_STAFF)
    const rejected = await createLeave({
      leaveType: "SICK",
      startDate: "2026-09-20",
      endDate: "2026-09-21",
    })
    authenticate(AUTH_HR)
    await rejectLeave(String(rejected.id))

    authenticate(AUTH_STAFF)
    const cancellable = await createLeave({
      leaveType: "ANNUAL",
      startDate: "2026-09-25",
      endDate: "2026-09-26",
    })
    authenticate(AUTH_HR)
    await cancelLeave(String(cancellable.id))

    const staffNotes = memory.tables.Notification.filter(
      (row) => row.recipientUserId === USER_STAFF,
    )
    expect(staffNotes.map((row) => row.type).sort()).toEqual([
      "LEAVE_APPROVED",
      "LEAVE_CANCELLED",
      "LEAVE_REJECTED",
    ])
  })

  it("does not create a user notification for unlinked staff", async () => {
    authenticate(AUTH_HR)
    const leave = await createLeave({
      staffId: "staff-unlinked",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })
    await approveLeave(String(leave.id))

    expect(
      memory.tables.Notification.filter((row) => row.type === "LEAVE_APPROVED"),
    ).toHaveLength(0)
  })

  it("does not persist notifications when the leave transaction rolls back", async () => {
    authenticate(AUTH_HR)
    await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })

    await expect(
      createLeave({
        staffId: "staff-ama",
        leaveType: "ANNUAL",
        startDate: "2026-09-11",
        endDate: "2026-09-13",
      }),
    ).rejects.toMatchObject({ code: "LEAVE_OVERLAP" })

    expect(memory.tables.LeaveRequest).toHaveLength(1)
    expect(
      memory.tables.NotificationOutbox.filter((row) => row.eventType === "LEAVE_REQUESTED"),
    ).toHaveLength(1)
  })

  it("keeps destination authorization on leave deep links", async () => {
    authenticate(AUTH_HR)
    const leave = await createLeave({
      staffId: "staff-ama",
      leaveType: "ANNUAL",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    })

    authenticate(AUTH_B)
    await expect(getLeave(String(leave.id))).rejects.toMatchObject({
      code: "LEAVE_NOT_FOUND",
    })
  })
})
