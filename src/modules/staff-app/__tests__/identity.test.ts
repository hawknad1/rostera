import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { createLeave } from "@/modules/leave/services/leave"
import {
  AUTH_STAFF,
  AUTH_TERMINATED,
  AUTH_UNLINKED,
  AUTH_ADMIN,
  AUTH_B,
  ORG_A,
  USER_STAFF,
  seedStaffApp,
} from "@/modules/staff-app/__tests__/helpers"
import {
  requireLinkedStaff,
  requireMutableStaff,
  resolveStaffIdentity,
} from "@/modules/staff-app/services/identity"
import { resolvePostAuthHref } from "@/modules/staff-app/services/post-auth"

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

beforeEach(() => {
  memory.reset()
  seedStaffApp()
})

describe("staff identity", () => {
  it("resolves an authenticated user to the linked StaffProfile in the current organization", async () => {
    authenticate(AUTH_STAFF)
    const identity = await resolveStaffIdentity()

    expect(identity.status).toBe("LINKED")
    if (identity.status !== "LINKED") {
      return
    }

    expect(identity.staff.id).toBe("staff-ama")
    expect(identity.staff.userId).toBe(USER_STAFF)
    expect(identity.staff.organizationId).toBe(ORG_A)
    expect(identity.canMutate).toBe(true)
  })

  it("rejects an unlinked membership", async () => {
    authenticate(AUTH_UNLINKED)
    const identity = await resolveStaffIdentity()

    expect(identity.status).toBe("UNLINKED")
    await expect(requireLinkedStaff()).rejects.toMatchObject({ code: "STAFF_NOT_LINKED" })
  })

  it("allows terminated staff to resolve but not mutate", async () => {
    authenticate(AUTH_TERMINATED)
    const identity = await resolveStaffIdentity()

    expect(identity.status).toBe("LINKED")
    if (identity.status === "LINKED") {
      expect(identity.canMutate).toBe(false)
      expect(identity.staff.employmentStatus).toBe("TERMINATED")
    }

    await expect(requireMutableStaff()).rejects.toMatchObject({ code: "STAFF_TERMINATED" })
  })

  it("does not attach a staff profile from another organization", async () => {
    authenticate(AUTH_B)
    const identity = await resolveStaffIdentity()

    expect(identity.status).toBe("LINKED")
    if (identity.status !== "LINKED") {
      return
    }

    expect(identity.staff.id).toBe("staff-b")
    expect(identity.staff.organizationId).not.toBe(ORG_A)
  })
})

describe("post-auth routing", () => {
  it("sends staff-only users to /me", async () => {
    authenticate(AUTH_STAFF)
    await expect(resolvePostAuthHref()).resolves.toBe("/me")
  })

  it("sends users with admin surface permissions to /dashboard", async () => {
    authenticate(AUTH_ADMIN)
    await expect(resolvePostAuthHref()).resolves.toBe("/dashboard")
  })
})

describe("staff identity mutations", () => {
  it("derives leave identity server-side for the linked staff member", async () => {
    authenticate(AUTH_STAFF)
    const leave = await createLeave({
      leaveType: "ANNUAL",
      startDate: "2026-09-14",
      endDate: "2026-09-15",
    })

    expect(leave.staffId).toBe("staff-ama")
    expect(leave.requestedByUserId).toBe(USER_STAFF)
    expect(leave.organizationId).toBe(ORG_A)
  })
})
