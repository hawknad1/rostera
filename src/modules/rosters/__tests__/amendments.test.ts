import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createRosterAmendmentInputSchema } from "@/modules/rosters/schemas/roster"
import { createAssignment, deleteAssignment } from "@/modules/rosters/services/assignments"
import { createRosterAmendment } from "@/modules/rosters/services/amendments"
import {
  deleteRoster,
  publishRoster,
  returnRosterToDraft,
  submitRosterForReview,
} from "@/modules/rosters/services/lifecycle"
import {
  compareRosterWithPrevious,
  createRoster,
  listRosters,
} from "@/modules/rosters/services/rosters"

const AUTH_USER_A = "supabase-auth-user-a"
const AUTH_USER_B = "supabase-auth-user-b"
const AUTH_HEAD = "supabase-auth-head"
const USER_A_ID = "user-a"
const USER_B_ID = "user-b"
const USER_HEAD_ID = "user-head"
const ORG_A_ID = "org-a"
const ORG_B_ID = "org-b"
const ROLE_A_ID = "role-a"
const ROLE_B_ID = "role-b"
const ROLE_HEAD_ID = "role-head"

const PERMISSION_IDS = {
  view: "perm-roster-view",
  create: "perm-roster-create",
  edit: "perm-roster-edit",
  review: "perm-roster-review",
  publish: "perm-roster-publish",
  amend: "perm-roster-amend",
} as const

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

function authenticateAsA() {
  getAuthUser.mockResolvedValue({ id: AUTH_USER_A })
}

function authenticateAsB() {
  getAuthUser.mockResolvedValue({ id: AUTH_USER_B })
}

function authenticateAsHead() {
  getAuthUser.mockResolvedValue({ id: AUTH_HEAD })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function grantManager(roleId: string) {
  grant(roleId, PERMISSION_IDS.view)
  grant(roleId, PERMISSION_IDS.create)
  grant(roleId, PERMISSION_IDS.edit)
  grant(roleId, PERMISSION_IDS.review)
  grant(roleId, PERMISSION_IDS.publish)
  grant(roleId, PERMISSION_IDS.amend)
}

function seed() {
  memory.insert("Permission", { id: PERMISSION_IDS.view, key: permissions.rosterView })
  memory.insert("Permission", { id: PERMISSION_IDS.create, key: permissions.rosterCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.edit, key: permissions.rosterEdit })
  memory.insert("Permission", { id: PERMISSION_IDS.review, key: permissions.rosterReview })
  memory.insert("Permission", { id: PERMISSION_IDS.publish, key: permissions.rosterPublish })
  memory.insert("Permission", { id: PERMISSION_IDS.amend, key: permissions.rosterAmend })

  memory.insert("Organization", {
    id: ORG_A_ID,
    name: "Hospital A",
    slug: "hospital-a",
    timezone: "Africa/Accra",
  })
  memory.insert("Organization", {
    id: ORG_B_ID,
    name: "Hospital B",
    slug: "hospital-b",
    timezone: "Africa/Accra",
  })
  memory.insert("User", { id: USER_A_ID, authProviderId: AUTH_USER_A, email: "a@test.local" })
  memory.insert("User", { id: USER_B_ID, authProviderId: AUTH_USER_B, email: "b@test.local" })
  memory.insert("User", { id: USER_HEAD_ID, authProviderId: AUTH_HEAD, email: "head@test.local" })
  memory.insert("Role", { id: ROLE_A_ID, organizationId: ORG_A_ID, name: "ROSTER_MANAGER" })
  memory.insert("Role", { id: ROLE_B_ID, organizationId: ORG_B_ID, name: "ROSTER_MANAGER" })
  memory.insert("Role", { id: ROLE_HEAD_ID, organizationId: ORG_A_ID, name: "DEPARTMENT_HEAD" })
  memory.insert("OrganizationMember", {
    id: "membership-a",
    organizationId: ORG_A_ID,
    userId: USER_A_ID,
    roleId: ROLE_A_ID,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-b",
    organizationId: ORG_B_ID,
    userId: USER_B_ID,
    roleId: ROLE_B_ID,
    status: "ACTIVE",
  })
  memory.insert("OrganizationMember", {
    id: "membership-head",
    organizationId: ORG_A_ID,
    userId: USER_HEAD_ID,
    roleId: ROLE_HEAD_ID,
    status: "ACTIVE",
  })
  grantManager(ROLE_A_ID)
  grantManager(ROLE_B_ID)
  grant(ROLE_HEAD_ID, PERMISSION_IDS.view)
  grant(ROLE_HEAD_ID, PERMISSION_IDS.create)
  grant(ROLE_HEAD_ID, PERMISSION_IDS.edit)
  grant(ROLE_HEAD_ID, PERMISSION_IDS.review)

  memory.insert("Profession", {
    id: "prof-nurse",
    organizationId: null,
    name: "Nurse",
    isActive: true,
  })
  memory.insert("Profession", {
    id: "prof-midwife",
    organizationId: null,
    name: "Midwife",
    isActive: true,
  })
  memory.insert("Department", { id: "dept-a", organizationId: ORG_A_ID, name: "Emergency" })
  memory.insert("Department", { id: "dept-b", organizationId: ORG_B_ID, name: "Emergency" })
  memory.insert("StaffProfile", {
    id: "staff-ama",
    organizationId: ORG_A_ID,
    staffNumber: "NUR-001",
    firstName: "Ama",
    lastName: "Mensah",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("StaffProfile", {
    id: "staff-kofi",
    organizationId: ORG_A_ID,
    staffNumber: "NUR-002",
    firstName: "Kofi",
    lastName: "Asante",
    professionId: "prof-nurse",
    departmentId: "dept-a",
    employmentStatus: "ACTIVE",
  })
  memory.insert("ShiftType", {
    id: "shift-day",
    organizationId: ORG_A_ID,
    name: "Day",
    startTime: "08:00",
    endTime: "16:00",
    isOvernight: false,
    isActive: true,
  })
  memory.insert("ShiftType", {
    id: "shift-late",
    organizationId: ORG_A_ID,
    name: "Late",
    startTime: "14:00",
    endTime: "22:00",
    isOvernight: false,
    isActive: true,
  })
}

function assignmentSnapshot(row: Record<string, unknown>) {
  return {
    id: row.id,
    staffId: row.staffId,
    shiftTypeId: row.shiftTypeId,
    professionId: row.professionId,
    departmentId: row.departmentId,
    date: row.date,
    shiftStartTime: row.shiftStartTime,
    shiftEndTime: row.shiftEndTime,
    isOvernight: row.isOvernight,
    startDateTime: String(row.startDateTime),
    endDateTime: String(row.endDateTime),
    rosterId: row.rosterId,
  }
}

async function createPublishedRoster() {
  const roster = await createRoster({
    name: "3 September — Emergency",
    departmentId: "dept-a",
    startDate: "2026-09-03",
    endDate: "2026-09-03",
  })
  const { assignment } = await createAssignment({
    rosterId: roster.id,
    date: "2026-09-03",
    shiftTypeId: "shift-day",
    staffId: "staff-ama",
  })
  await submitRosterForReview(roster.id)
  const published = await publishRoster(roster.id)
  return { roster: published, assignment }
}

describe("roster amendments and versioning", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seed()
    authenticateAsA()
  })

  it("creates the first roster as version 1", async () => {
    const roster = await createRoster({
      name: "September Emergency",
      departmentId: "dept-a",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    })

    expect(roster.versionNumber).toBe(1)
    expect(roster.parentRosterId).toBeNull()
    expect(roster.seriesId).toEqual(expect.any(String))
  })

  it("requires a trimmed, bounded amendment reason", () => {
    expect(createRosterAmendmentInputSchema.safeParse({ rosterId: "r1", reason: "   " }).success).toBe(
      false,
    )
    expect(createRosterAmendmentInputSchema.safeParse({ rosterId: "r1", reason: "x".repeat(281) }).success).toBe(
      false,
    )
    expect(
      createRosterAmendmentInputSchema.parse({
        rosterId: "r1",
        reason: "  Coverage adjustment for weekend shifts.  ",
      }).reason,
    ).toBe("Coverage adjustment for weekend shifts.")
  })

  it("creates version 2 as a draft with copied assignment rows and preserves the source", async () => {
    const { roster: source, assignment } = await createPublishedRoster()
    const sourceRow = { ...memory.tables.Roster.find((row) => row.id === source.id)! }
    const sourceAssignment = assignmentSnapshot(
      memory.tables.ShiftAssignment.find((row) => row.id === assignment.id) as Record<string, unknown>,
    )
    const sourceAuditCount = memory.tables.AuditEvent.filter(
      (row) => row.entityId === source.id,
    ).length

    const amendment = await createRosterAmendment({
      rosterId: source.id,
      reason: "Staff member approved for emergency leave.",
    })

    expect(amendment).toMatchObject({
      status: "DRAFT",
      versionNumber: 2,
      parentRosterId: source.id,
      seriesId: source.seriesId,
      amendmentReason: "Staff member approved for emergency leave.",
      organizationId: ORG_A_ID,
      createdByUserId: USER_A_ID,
    })

    const copies = memory.tables.ShiftAssignment.filter((row) => row.rosterId === amendment.id)
    expect(copies).toHaveLength(1)
    expect(copies[0]?.id).not.toBe(assignment.id)
    expect(copies[0]).toMatchObject({
      staffId: sourceAssignment.staffId,
      shiftTypeId: sourceAssignment.shiftTypeId,
      professionId: sourceAssignment.professionId,
      departmentId: sourceAssignment.departmentId,
      date: sourceAssignment.date,
      shiftStartTime: sourceAssignment.shiftStartTime,
      shiftEndTime: sourceAssignment.shiftEndTime,
      isOvernight: sourceAssignment.isOvernight,
      copiedFromAssignmentId: assignment.id,
    })

    expect(memory.tables.Roster.find((row) => row.id === source.id)).toMatchObject({
      status: "PUBLISHED",
      name: sourceRow.name,
      startDate: sourceRow.startDate,
      endDate: sourceRow.endDate,
      departmentId: sourceRow.departmentId,
      seriesId: sourceRow.seriesId,
      versionNumber: sourceRow.versionNumber,
    })
    expect(
      assignmentSnapshot(
        memory.tables.ShiftAssignment.find((row) => row.id === assignment.id) as Record<string, unknown>,
      ),
    ).toEqual(sourceAssignment)
    expect(memory.tables.AuditEvent.filter((row) => row.entityId === source.id)).toHaveLength(
      sourceAuditCount,
    )
  })

  it("preserves copied assignment snapshots even if current staff configuration changes", async () => {
    const { roster: source, assignment } = await createPublishedRoster()
    memory.tables.StaffProfile.find((row) => row.id === "staff-ama")!.professionId = "prof-midwife"

    const amendment = await createRosterAmendment({
      rosterId: source.id,
      reason: "Corrected assignment after departmental review.",
    })
    const copy = memory.tables.ShiftAssignment.find((row) => row.rosterId === amendment.id)

    expect(copy?.professionId).toBe("prof-nurse")
    expect(
      memory.tables.ShiftAssignment.find((row) => row.id === assignment.id)?.professionId,
    ).toBe("prof-nurse")
  })

  it("rejects amending a draft and a historical published version", async () => {
    const draft = await createRoster({
      name: "Draft",
      departmentId: "dept-a",
      startDate: "2026-09-03",
      endDate: "2026-09-03",
    })
    await expect(
      createRosterAmendment({ rosterId: draft.id, reason: "Not published." }),
    ).rejects.toMatchObject({ code: "ROSTER_NOT_PUBLISHED" })

    const { roster: v1 } = await createPublishedRoster()
    const v2 = await createRosterAmendment({
      rosterId: v1.id,
      reason: "Coverage adjustment for weekend shifts.",
    })
    await submitRosterForReview(v2.id)
    await publishRoster(v2.id)

    await expect(
      createRosterAmendment({ rosterId: v1.id, reason: "Too late to amend v1." }),
    ).rejects.toMatchObject({ code: "NOT_CURRENT_PUBLISHED_VERSION" })
  })

  it("allows only one active unpublished amendment", async () => {
    const { roster: source } = await createPublishedRoster()
    const first = await createRosterAmendment({
      rosterId: source.id,
      reason: "First amendment.",
    })

    await expect(
      createRosterAmendment({ rosterId: source.id, reason: "Second amendment." }),
    ).rejects.toMatchObject({ code: "AMENDMENT_ALREADY_EXISTS" })

    await expect(
      memory.db.orm.public.Roster.create({
        organizationId: ORG_A_ID,
        departmentId: "dept-a",
        name: source.name,
        startDate: source.startDate,
        endDate: source.endDate,
        status: "DRAFT",
        seriesId: source.seriesId,
        versionNumber: 2,
        parentRosterId: source.id,
        amendmentReason: "Competing version number.",
        createdByUserId: USER_A_ID,
      }),
    ).rejects.toMatchObject({ sqlState: "23505" })

    await deleteRoster(first.id)
    const retry = await createRosterAmendment({
      rosterId: source.id,
      reason: "Retry after deleting the draft.",
    })
    expect(retry.versionNumber).toBe(2)
  })

  it("forbids unauthorized and cross-tenant amendment creation", async () => {
    const { roster: source } = await createPublishedRoster()

    authenticateAsHead()
    await expect(
      createRosterAmendment({ rosterId: source.id, reason: "Department head cannot amend." }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })

    authenticateAsB()
    await expect(
      createRosterAmendment({ rosterId: source.id, reason: "Other hospital." }),
    ).rejects.toMatchObject({ code: "ROSTER_NOT_FOUND" })
  })

  it("follows the existing lifecycle on an amendment without mutating version 1", async () => {
    const { roster: v1, assignment } = await createPublishedRoster()
    const v1Assignment = assignmentSnapshot(
      memory.tables.ShiftAssignment.find((row) => row.id === assignment.id) as Record<string, unknown>,
    )
    const amendment = await createRosterAmendment({
      rosterId: v1.id,
      reason: "Coverage adjustment for weekend shifts.",
    })

    await expect(publishRoster(amendment.id)).rejects.toMatchObject({
      code: "ROSTER_NOT_PUBLISHABLE",
    })

    const copy = memory.tables.ShiftAssignment.find((row) => row.rosterId === amendment.id)!
    await deleteAssignment({ id: String(copy.id) })
    await createAssignment({
      rosterId: amendment.id,
      date: "2026-09-03",
      shiftTypeId: "shift-day",
      staffId: "staff-kofi",
    })

    expect(
      assignmentSnapshot(
        memory.tables.ShiftAssignment.find((row) => row.id === assignment.id) as Record<string, unknown>,
      ),
    ).toEqual(v1Assignment)
    expect(memory.tables.Roster.find((row) => row.id === v1.id)?.status).toBe("PUBLISHED")

    await submitRosterForReview(amendment.id)
    await returnRosterToDraft(amendment.id)
    await submitRosterForReview(amendment.id)
    const published = await publishRoster(amendment.id)

    expect(published.status).toBe("PUBLISHED")
    expect(memory.tables.Roster.find((row) => row.id === v1.id)?.status).toBe("PUBLISHED")
    expect(
      assignmentSnapshot(
        memory.tables.ShiftAssignment.find((row) => row.id === assignment.id) as Record<string, unknown>,
      ),
    ).toEqual(v1Assignment)

    await expect(publishRoster(amendment.id)).rejects.toMatchObject({
      code: "ROSTER_ALREADY_PUBLISHED",
    })
    await expect(deleteRoster(amendment.id)).rejects.toMatchObject({
      code: "ROSTER_ALREADY_PUBLISHED",
    })

    const listed = await listRosters()
    expect(listed.map((row) => row.id)).toEqual([amendment.id])
    expect(listed[0]?.status).toBe("PUBLISHED")
  })

  it("rejects publishing an amendment whose source is no longer current", async () => {
    const { roster: v1 } = await createPublishedRoster()
    const v2 = await createRosterAmendment({
      rosterId: v1.id,
      reason: "Legitimate amendment.",
    })
    await submitRosterForReview(v2.id)
    await publishRoster(v2.id)

    const stale = await memory.db.orm.public.Roster.create({
      organizationId: ORG_A_ID,
      departmentId: "dept-a",
      name: v1.name,
      startDate: v1.startDate,
      endDate: v1.endDate,
      status: "IN_REVIEW",
      seriesId: v1.seriesId,
      versionNumber: 3,
      parentRosterId: v1.id,
      amendmentReason: "Stale parent.",
      createdByUserId: USER_A_ID,
    })

    await expect(publishRoster(String(stale.id))).rejects.toMatchObject({
      code: "NOT_CURRENT_PUBLISHED_VERSION",
    })
    expect(memory.tables.Roster.find((row) => row.id === v2.id)?.status).toBe("PUBLISHED")
    expect(memory.tables.Roster.find((row) => row.id === stale.id)?.status).toBe("IN_REVIEW")
  })

  it("deletes a draft amendment without touching the source version", async () => {
    const { roster: v1, assignment } = await createPublishedRoster()
    const sourceAudit = memory.tables.AuditEvent.filter((row) => row.entityId === v1.id).length
    const amendment = await createRosterAmendment({
      rosterId: v1.id,
      reason: "Will be discarded.",
    })

    await deleteRoster(amendment.id)

    expect(memory.tables.Roster.find((row) => row.id === amendment.id)).toBeUndefined()
    expect(memory.tables.ShiftAssignment.filter((row) => row.rosterId === amendment.id)).toHaveLength(0)
    expect(memory.tables.Roster.find((row) => row.id === v1.id)?.status).toBe("PUBLISHED")
    expect(memory.tables.ShiftAssignment.find((row) => row.id === assignment.id)?.rosterId).toBe(v1.id)
    expect(memory.tables.AuditEvent.filter((row) => row.entityId === v1.id)).toHaveLength(sourceAudit)
    expect(
      memory.tables.AuditEvent.find((row) => row.action === "ROSTER_DELETED")?.metadata,
    ).toContain("versionNumber")
  })

  it("compares added, removed, and changed assignments and rejects cross-tenant access", async () => {
    const { roster: v1 } = await createPublishedRoster()
    const amendment = await createRosterAmendment({
      rosterId: v1.id,
      reason: "Staffing changes.",
    })
    const copy = memory.tables.ShiftAssignment.find((row) => row.rosterId === amendment.id)!
    await deleteAssignment({ id: String(copy.id) })
    await createAssignment({
      rosterId: amendment.id,
      date: "2026-09-03",
      shiftTypeId: "shift-late",
      staffId: "staff-kofi",
    })

    const comparison = await compareRosterWithPrevious(amendment.id)
    expect(comparison.removed.length + comparison.changed.length).toBeGreaterThan(0)
    expect(comparison.added.length + comparison.changed.length).toBeGreaterThan(0)

    authenticateAsB()
    await expect(compareRosterWithPrevious(amendment.id)).rejects.toMatchObject({
      code: "ROSTER_NOT_FOUND",
    })
  })

  it("writes amendment audit transactionally and does not persist copies when audit fails", async () => {
    const { roster: source } = await createPublishedRoster()
    memory.failNextCreate("AuditEvent")

    await expect(
      createRosterAmendment({
        rosterId: source.id,
        reason: "Should roll back.",
      }),
    ).rejects.toMatchObject({ code: "FAILED" })

    expect(memory.tables.Roster.filter((row) => row.parentRosterId === source.id)).toHaveLength(0)
    expect(memory.tables.AuditEvent.filter((row) => row.action === "ROSTER_AMENDMENT_CREATED")).toHaveLength(
      0,
    )
  })

  it("audits amendment creation with server-derived actor and version context", async () => {
    const { roster: source } = await createPublishedRoster()
    const amendment = await createRosterAmendment({
      rosterId: source.id,
      reason: "Emergency staffing adjustment",
    })

    const created = memory.tables.AuditEvent.find((row) => row.action === "ROSTER_AMENDMENT_CREATED")
    expect(created).toMatchObject({
      organizationId: ORG_A_ID,
      actorUserId: USER_A_ID,
      entityId: amendment.id,
    })
    expect(String(created?.metadata)).toContain("sourceRosterId")
    expect(String(created?.metadata)).toContain("newVersion")
    expect(String(created?.summary)).not.toContain("password")
  })
})
