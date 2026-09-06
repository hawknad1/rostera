import { beforeEach, describe, expect, it, vi } from "vitest"

import { memory } from "@/lib/auth/__tests__/in-memory-orm"
import { permissions } from "@/lib/permissions/permissions"
import { createShiftTypeInputSchema } from "@/modules/shifts/schemas/shift-type"
import {
  createShiftType,
  deactivateShiftType,
  getShiftType,
  listShiftTypes,
  updateShiftType,
} from "@/modules/shifts/services/shift-types"

const AUTH_USER_A = "supabase-auth-user-a"
const AUTH_USER_B = "supabase-auth-user-b"
const USER_A_ID = "user-a"
const USER_B_ID = "user-b"
const ORG_A_ID = "org-a"
const ORG_B_ID = "org-b"
const ROLE_A_ID = "role-a"
const ROLE_B_ID = "role-b"

const PERMISSION_IDS = {
  view: "perm-shift-view",
  create: "perm-shift-create",
  edit: "perm-shift-edit",
  deactivate: "perm-shift-deactivate",
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

function seedPermissionCatalog() {
  memory.insert("Permission", { id: PERMISSION_IDS.view, key: permissions.shiftView })
  memory.insert("Permission", { id: PERMISSION_IDS.create, key: permissions.shiftCreate })
  memory.insert("Permission", { id: PERMISSION_IDS.edit, key: permissions.shiftEdit })
  memory.insert("Permission", { id: PERMISSION_IDS.deactivate, key: permissions.shiftDeactivate })
}

function grant(roleId: string, permissionId: string) {
  memory.insert("RolePermission", { roleId, permissionId })
}

function grantAll(roleId: string) {
  grant(roleId, PERMISSION_IDS.view)
  grant(roleId, PERMISSION_IDS.create)
  grant(roleId, PERMISSION_IDS.edit)
  grant(roleId, PERMISSION_IDS.deactivate)
}

function seedHospitals() {
  memory.insert("Organization", { id: ORG_A_ID, name: "Hospital A", slug: "hospital-a" })
  memory.insert("Organization", { id: ORG_B_ID, name: "Hospital B", slug: "hospital-b" })
  memory.insert("User", { id: USER_A_ID, authProviderId: AUTH_USER_A, email: "a@test.local" })
  memory.insert("User", { id: USER_B_ID, authProviderId: AUTH_USER_B, email: "b@test.local" })
  memory.insert("Role", { id: ROLE_A_ID, organizationId: ORG_A_ID, name: "SUPER_ADMIN" })
  memory.insert("Role", { id: ROLE_B_ID, organizationId: ORG_B_ID, name: "SUPER_ADMIN" })
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
}

const validDay = {
  name: "Day",
  startTime: "08:00",
  endTime: "16:00",
  isOvernight: false,
}

const validNight = {
  name: "Night",
  startTime: "22:00",
  endTime: "06:00",
  isOvernight: true,
}

describe("shift type services", () => {
  beforeEach(() => {
    memory.reset()
    getAuthUser.mockReset()
    seedPermissionCatalog()
    seedHospitals()
    grantAll(ROLE_A_ID)
    grantAll(ROLE_B_ID)
    authenticateAsA()
  })

  it("lets an authorized organization create a shift type", async () => {
    const shiftType = await createShiftType(validDay)

    expect(shiftType).toMatchObject({
      name: "Day",
      startTime: "08:00",
      endTime: "16:00",
      isOvernight: false,
      isActive: true,
      organizationId: ORG_A_ID,
      durationMinutes: 8 * 60,
      durationLabel: "8 hours",
    })
    expect(memory.tables.ShiftType).toHaveLength(1)
  })

  it("denies create when shift.create is missing", async () => {
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.view)
    authenticateAsA()

    await expect(createShiftType(validDay)).rejects.toMatchObject({
      name: "ShiftError",
      code: "FORBIDDEN",
    })
    expect(memory.tables.ShiftType).toHaveLength(0)
  })

  it("takes organizationId from the active membership, not client input", async () => {
    const shiftType = await createShiftType({
      ...validDay,
      organizationId: ORG_B_ID,
    } as typeof validDay & { organizationId: string })

    expect(shiftType.organizationId).toBe(ORG_A_ID)
    expect(memory.tables.ShiftType[0]?.organizationId).toBe(ORG_A_ID)
  })

  it("ignores client-supplied organizationId on the input schema", () => {
    const parsed = createShiftTypeInputSchema.parse({
      name: "  Evening  ",
      startTime: "16:00",
      endTime: "22:00",
      organizationId: ORG_B_ID,
      userId: USER_B_ID,
    })

    expect(parsed).toEqual({
      name: "Evening",
      startTime: "16:00",
      endTime: "22:00",
      isOvernight: false,
    })
    expect(parsed).not.toHaveProperty("organizationId")
  })

  it("rejects a duplicate name within the same organization", async () => {
    await createShiftType(validNight)

    await expect(createShiftType(validNight)).rejects.toMatchObject({
      name: "ShiftError",
      code: "DUPLICATE",
    })
    expect(memory.tables.ShiftType).toHaveLength(1)
  })

  it("rejects a case-insensitive duplicate name within the same organization", async () => {
    await createShiftType(validNight)

    await expect(createShiftType({ ...validNight, name: "night" })).rejects.toMatchObject({
      name: "ShiftError",
      code: "DUPLICATE",
    })
  })

  it("allows the same shift name in two organizations", async () => {
    await createShiftType(validNight)

    authenticateAsB()
    const hospitalB = await createShiftType(validNight)

    expect(hospitalB.organizationId).toBe(ORG_B_ID)
    expect(memory.tables.ShiftType).toHaveLength(2)
  })

  it("accepts a valid overnight shift", async () => {
    const shiftType = await createShiftType(validNight)

    expect(shiftType).toMatchObject({
      isOvernight: true,
      durationMinutes: 8 * 60,
      startTime: "22:00",
      endTime: "06:00",
    })
  })

  it("rejects a zero-duration shift", async () => {
    await expect(
      createShiftType({
        name: "Invalid",
        startTime: "08:00",
        endTime: "08:00",
        isOvernight: false,
      }),
    ).rejects.toMatchObject({
      name: "ShiftError",
      code: "CONFLICT",
    })
    expect(memory.tables.ShiftType).toHaveLength(0)
  })

  it("rejects invalid times through the schema", () => {
    const parsed = createShiftTypeInputSchema.safeParse({
      name: "Broken",
      startTime: "25:00",
      endTime: "16:00",
      isOvernight: false,
    })

    expect(parsed.success).toBe(false)
  })

  it("updates a shift within the tenant", async () => {
    const created = await createShiftType(validDay)
    const updated = await updateShiftType({
      id: created.id,
      name: "Morning",
      startTime: "07:30",
      endTime: "15:30",
      isOvernight: false,
    })

    expect(updated).toMatchObject({
      name: "Morning",
      startTime: "07:30",
      endTime: "15:30",
      durationMinutes: 8 * 60,
      organizationId: ORG_A_ID,
    })
  })

  it("does not let Hospital A update Hospital B's shift", async () => {
    authenticateAsB()
    const hospitalB = await createShiftType(validNight)

    authenticateAsA()
    await expect(
      updateShiftType({
        id: hospitalB.id,
        name: "Hijacked",
        startTime: "08:00",
        endTime: "16:00",
        isOvernight: false,
      }),
    ).rejects.toMatchObject({
      name: "ShiftError",
      code: "NOT_FOUND",
    })

    expect(memory.tables.ShiftType[0]).toMatchObject({
      name: "Night",
      organizationId: ORG_B_ID,
    })
  })

  it("deactivates a shift without deleting it", async () => {
    const created = await createShiftType(validNight)
    const deactivated = await deactivateShiftType({ id: created.id })

    expect(deactivated.isActive).toBe(false)
    expect(memory.tables.ShiftType).toHaveLength(1)

    const retrieved = await getShiftType(created.id)
    expect(retrieved.isActive).toBe(false)
    expect(retrieved.name).toBe("Night")
  })

  it("does not let Hospital A deactivate Hospital B's shift", async () => {
    authenticateAsB()
    const hospitalB = await createShiftType(validNight)

    authenticateAsA()
    await expect(deactivateShiftType({ id: hospitalB.id })).rejects.toMatchObject({
      name: "ShiftError",
      code: "NOT_FOUND",
    })
    expect(memory.tables.ShiftType[0]?.isActive).toBe(true)
  })

  it("does not let Hospital A read Hospital B's shift", async () => {
    authenticateAsB()
    const hospitalB = await createShiftType(validNight)

    authenticateAsA()
    await expect(getShiftType(hospitalB.id)).rejects.toMatchObject({
      name: "ShiftError",
      code: "NOT_FOUND",
    })
  })

  it("lists only the current organization's shifts", async () => {
    await createShiftType(validDay)
    authenticateAsB()
    await createShiftType(validNight)

    authenticateAsA()
    const listed = await listShiftTypes()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.name).toBe("Day")
  })

  it("denies list when shift.view is missing", async () => {
    memory.reset()
    seedPermissionCatalog()
    seedHospitals()
    grant(ROLE_A_ID, PERMISSION_IDS.create)
    authenticateAsA()

    await expect(listShiftTypes()).rejects.toMatchObject({
      name: "ShiftError",
      code: "FORBIDDEN",
    })
  })

  it("enforces organization-scoped name uniqueness in the data store", async () => {
    await createShiftType(validDay)

    await expect(
      memory.db.orm.public.ShiftType.create({
        organizationId: ORG_A_ID,
        name: "Day",
        startTime: "09:00",
        endTime: "17:00",
        isOvernight: false,
      }),
    ).rejects.toMatchObject({ sqlState: "23505" })
  })
})
