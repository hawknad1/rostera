import { intervalsOverlap, toInstant } from "@/lib/dates/assignment-window"
import { calendarDateRangesOverlap } from "@/lib/dates/calendar-date"

type Row = Record<string, unknown>

export type QueryCall = {
  model: string
  where: Record<string, unknown>
  includes: string[]
}

const MODEL_NAMES = [
  "User",
  "Organization",
  "OrganizationMember",
  "OrganizationSchedulingPolicy",
  "Role",
  "Permission",
  "RolePermission",
  "Department",
  "Profession",
  "StaffProfile",
  "ShiftType",
  "StaffingRequirement",
  "Roster",
  "ShiftAssignment",
  "LeaveRequest",
] as const

type ModelName = (typeof MODEL_NAMES)[number]
type FailedCreate = { model: ModelName; error?: unknown }

function matches(row: Row, where: Record<string, unknown>) {
  return Object.entries(where).every(([field, value]) => row[field] === value)
}

function exclusionViolation(table: string, constraint: string) {
  const error = new Error("exclusion constraint violation") as Error & {
    kind: "sql_query"
    sqlState: "23P01"
    table: string
    constraint: string
  }

  error.name = "SqlQueryError"
  error.kind = "sql_query"
  error.sqlState = "23P01"
  error.table = table
  error.constraint = constraint

  return error
}

function uniqueViolation(table: string, column: string) {
  const error = new Error("unique constraint violation") as Error & {
    kind: "sql_query"
    sqlState: "23505"
    table: string
    column: string
    constraint: string
  }

  error.name = "SqlQueryError"
  error.kind = "sql_query"
  error.sqlState = "23505"
  error.table = table
  error.column = column
  error.constraint = `${table}_${column}_key`

  return error
}

function assertUnique(tables: Record<ModelName, Row[]>, model: ModelName, row: Row) {
  const idClash = tables[model].some(
    (existing) => existing.id === row.id && existing !== row && row.id,
  )
  if (row.id && idClash) {
    throw uniqueViolation(modelTable(model), "id")
  }

  if (
    model === "Organization" &&
    tables.Organization.some((existing) => existing !== row && existing.slug === row.slug)
  ) {
    throw uniqueViolation("organization", "slug")
  }

  if (
    model === "User" &&
    tables.User.some(
      (existing) => existing !== row && existing.authProviderId === row.authProviderId,
    )
  ) {
    throw uniqueViolation("user", "authProviderId")
  }

  if (
    model === "Permission" &&
    tables.Permission.some((existing) => existing !== row && existing.key === row.key)
  ) {
    throw uniqueViolation("permission", "key")
  }

  if (
    model === "Role" &&
    tables.Role.some(
      (existing) =>
        existing !== row &&
        existing.organizationId === row.organizationId &&
        existing.name === row.name,
    )
  ) {
    throw uniqueViolation("role", "name")
  }

  if (
    model === "OrganizationMember" &&
    tables.OrganizationMember.some(
      (existing) =>
        existing !== row &&
        existing.organizationId === row.organizationId &&
        existing.userId === row.userId,
    )
  ) {
    throw uniqueViolation("organizationMember", "userId")
  }

  if (
    model === "RolePermission" &&
    tables.RolePermission.some(
      (existing) =>
        existing !== row &&
        existing.roleId === row.roleId &&
        existing.permissionId === row.permissionId,
    )
  ) {
    throw uniqueViolation("rolePermission", "permissionId")
  }

  if (model === "Department") {
    if (
      tables.Department.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.name === row.name,
      )
    ) {
      throw uniqueViolation("department", "name")
    }

    if (
      row.headStaffId &&
      tables.Department.some(
        (existing) => existing !== row && existing.headStaffId === row.headStaffId,
      )
    ) {
      throw uniqueViolation("department", "headStaffId")
    }
  }

  if (model === "StaffProfile") {
    if (
      tables.StaffProfile.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.staffNumber === row.staffNumber,
      )
    ) {
      throw uniqueViolation("staffProfile", "staffNumber")
    }

    if (
      row.userId &&
      tables.StaffProfile.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.userId === row.userId,
      )
    ) {
      throw uniqueViolation("staffProfile", "userId")
    }
  }

  if (model === "ShiftType") {
    if (
      tables.ShiftType.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.name === row.name,
      )
    ) {
      throw uniqueViolation("shiftType", "name")
    }
  }

  if (model === "StaffingRequirement") {
    if (
      tables.StaffingRequirement.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.departmentId === row.departmentId &&
          existing.shiftTypeId === row.shiftTypeId &&
          existing.professionId === row.professionId,
      )
    ) {
      throw uniqueViolation("staffingRequirement", "combo")
    }
  }

  if (model === "ShiftAssignment") {
    if (
      tables.ShiftAssignment.some(
        (existing) =>
          existing !== row &&
          existing.rosterId === row.rosterId &&
          existing.staffId === row.staffId &&
          existing.shiftTypeId === row.shiftTypeId &&
          existing.date === row.date,
      )
    ) {
      throw uniqueViolation("shiftAssignment", "combo")
    }
  }

  if (
    model === "OrganizationSchedulingPolicy" &&
    tables.OrganizationSchedulingPolicy.some(
      (existing) => existing !== row && existing.organizationId === row.organizationId,
    )
  ) {
    throw uniqueViolation("organizationSchedulingPolicy", "organizationId")
  }
}

function assertNoActiveLeaveOverlap(tables: Record<ModelName, Row[]>, model: ModelName, row: Row) {
  if (model !== "LeaveRequest") {
    return
  }

  if (row.status !== "PENDING" && row.status !== "APPROVED") {
    return
  }

  const overlapping = tables.LeaveRequest.some(
    (existing) =>
      existing !== row &&
      existing.staffId === row.staffId &&
      (existing.status === "PENDING" || existing.status === "APPROVED") &&
      calendarDateRangesOverlap(
        String(existing.startDate),
        String(existing.endDate),
        String(row.startDate),
        String(row.endDate),
      ),
  )

  if (overlapping) {
    throw exclusionViolation("leaveRequest", "leaveRequest_staff_active_overlap_excl")
  }
}

function assertNoStaffTimeOverlap(tables: Record<ModelName, Row[]>, model: ModelName, row: Row) {
  if (model !== "ShiftAssignment") {
    return
  }

  const nextStart = toInstant(row.startDateTime)
  const nextEnd = toInstant(row.endDateTime)
  const overlapping = tables.ShiftAssignment.some(
    (existing) =>
      existing !== row &&
      existing.staffId === row.staffId &&
      intervalsOverlap(
        toInstant(existing.startDateTime),
        toInstant(existing.endDateTime),
        nextStart,
        nextEnd,
      ),
  )

  if (overlapping) {
    throw exclusionViolation("shiftAssignment", "shiftAssignment_staff_time_excl")
  }
}

function modelTable(model: ModelName) {
  switch (model) {
    case "OrganizationMember":
      return "organizationMember"
    case "RolePermission":
      return "rolePermission"
    case "StaffProfile":
      return "staffProfile"
    case "ShiftType":
      return "shiftType"
    case "StaffingRequirement":
      return "staffingRequirement"
    case "ShiftAssignment":
      return "shiftAssignment"
    default:
      return model.charAt(0).toLowerCase() + model.slice(1)
  }
}

function withCreateDefaults(model: ModelName, data: Row): Row {
  const row: Row = { ...data }

  if (!row.id && model !== "RolePermission") {
    row.id = crypto.randomUUID()
  }

  if (model === "Organization") {
    row.country ??= "Ghana"
    row.timezone ??= "Africa/Accra"
    row.status ??= "ACTIVE"
  }

  if (model === "OrganizationMember") {
    row.status ??= "INVITED"
  }

  if (model === "Profession") {
    row.isActive ??= true
  }

  if (model === "StaffProfile") {
    row.employmentStatus ??= "ACTIVE"
    row.employmentType ??= "FULL_TIME"
  }

  if (model === "ShiftType") {
    row.isActive ??= true
  }

  if (model === "Roster") {
    row.status ??= "DRAFT"
  }

  if (model === "LeaveRequest") {
    row.status ??= "PENDING"
  }

  return row
}

function hydrate(
  tables: Record<ModelName, Row[]>,
  model: ModelName,
  row: Row,
  includes: string[],
) {
  const result: Row = { ...row }

  if (model === "OrganizationMember") {
    if (includes.includes("organization")) {
      result.organization =
        tables.Organization.find((organization) => organization.id === row.organizationId) ?? null
    }

    if (includes.includes("role")) {
      result.role = tables.Role.find((role) => role.id === row.roleId) ?? null
    }
  }

  if (model === "StaffProfile") {
    if (includes.includes("department")) {
      result.department =
        tables.Department.find((department) => department.id === row.departmentId) ?? null
    }

    if (includes.includes("profession")) {
      result.profession =
        tables.Profession.find((profession) => profession.id === row.professionId) ?? null
    }

    if (includes.includes("user")) {
      result.user = row.userId
        ? (tables.User.find((user) => user.id === row.userId) ?? null)
        : null
    }
  }

  if (model === "Department" && includes.includes("headStaff")) {
    result.headStaff = row.headStaffId
      ? (tables.StaffProfile.find((staff) => staff.id === row.headStaffId) ?? null)
      : null
  }

  if (model === "Roster" && includes.includes("department")) {
    result.department =
      tables.Department.find((department) => department.id === row.departmentId) ?? null
  }

  if (model === "ShiftAssignment") {
    if (includes.includes("staff")) {
      result.staff = tables.StaffProfile.find((staff) => staff.id === row.staffId) ?? null
    }

    if (includes.includes("shiftType")) {
      result.shiftType =
        tables.ShiftType.find((shiftType) => shiftType.id === row.shiftTypeId) ?? null
    }

    if (includes.includes("profession")) {
      result.profession =
        tables.Profession.find((profession) => profession.id === row.professionId) ?? null
    }
  }

  return result
}

function matchingRows(tables: Record<ModelName, Row[]>, model: ModelName, where: Record<string, unknown>) {
  return tables[model].filter((candidate) => matches(candidate, where))
}

function createCollection(
  tables: Record<ModelName, Row[]>,
  queries: QueryCall[],
  failCreates: FailedCreate[],
  model: ModelName,
  where: Record<string, unknown>,
  includes: string[],
) {
  return {
    where(nextWhere: Record<string, unknown>) {
      return createCollection(
        tables,
        queries,
        failCreates,
        model,
        { ...where, ...nextWhere },
        includes,
      )
    },
    include(relation: string) {
      return createCollection(tables, queries, failCreates, model, where, [
        ...includes,
        relation,
      ])
    },
    async first() {
      queries.push({ model, where, includes })
      const row = tables[model].find((candidate) => matches(candidate, where))
      if (!row) {
        return null
      }
      return hydrate(tables, model, row, includes)
    },
    async all() {
      queries.push({ model, where, includes })
      return tables[model]
        .filter((candidate) => matches(candidate, where))
        .map((row) => hydrate(tables, model, row, includes))
    },
    async create(data: Row) {
      if (failCreates[0]?.model === model) {
        const next = failCreates.shift()
        throw next?.error ?? new Error("simulated create failure")
      }

      const row = withCreateDefaults(model, data)
      assertUnique(tables, model, row)
      assertNoStaffTimeOverlap(tables, model, row)
      assertNoActiveLeaveOverlap(tables, model, row)
      tables[model].push(row)
      return hydrate(tables, model, row, includes)
    },
    async createAll(records: readonly Row[]) {
      const created: Row[] = []

      for (const data of records) {
        created.push(
          await createCollection(tables, queries, failCreates, model, where, includes).create(
            data,
          ),
        )
      }

      return created
    },
    async update(data: Row) {
      queries.push({ model, where, includes })
      const row = matchingRows(tables, model, where)[0]
      if (!row) {
        return null
      }

      Object.assign(row, data)
      assertUnique(tables, model, row)
      assertNoStaffTimeOverlap(tables, model, row)
      assertNoActiveLeaveOverlap(tables, model, row)
      return hydrate(tables, model, row, includes)
    },
    async delete() {
      queries.push({ model, where, includes })
      const index = tables[model].findIndex((candidate) => matches(candidate, where))
      if (index === -1) {
        return null
      }

      const [row] = tables[model].splice(index, 1)
      return hydrate(tables, model, row!, includes)
    },
  }
}

function createPublicOrm(
  tables: Record<ModelName, Row[]>,
  queries: QueryCall[],
  failCreates: FailedCreate[],
) {
  return {
    User: createCollection(tables, queries, failCreates, "User", {}, []),
    Organization: createCollection(tables, queries, failCreates, "Organization", {}, []),
    OrganizationMember: createCollection(
      tables,
      queries,
      failCreates,
      "OrganizationMember",
      {},
      [],
    ),
    OrganizationSchedulingPolicy: createCollection(
      tables,
      queries,
      failCreates,
      "OrganizationSchedulingPolicy",
      {},
      [],
    ),
    Role: createCollection(tables, queries, failCreates, "Role", {}, []),
    Permission: createCollection(tables, queries, failCreates, "Permission", {}, []),
    RolePermission: createCollection(tables, queries, failCreates, "RolePermission", {}, []),
    Department: createCollection(tables, queries, failCreates, "Department", {}, []),
    Profession: createCollection(tables, queries, failCreates, "Profession", {}, []),
    StaffProfile: createCollection(tables, queries, failCreates, "StaffProfile", {}, []),
    ShiftType: createCollection(tables, queries, failCreates, "ShiftType", {}, []),
    StaffingRequirement: createCollection(
      tables,
      queries,
      failCreates,
      "StaffingRequirement",
      {},
      [],
    ),
    Roster: createCollection(tables, queries, failCreates, "Roster", {}, []),
    ShiftAssignment: createCollection(tables, queries, failCreates, "ShiftAssignment", {}, []),
    LeaveRequest: createCollection(tables, queries, failCreates, "LeaveRequest", {}, []),
  }
}

function emptyTables(): Record<ModelName, Row[]> {
  return {
    User: [],
    Organization: [],
    OrganizationMember: [],
    OrganizationSchedulingPolicy: [],
    Role: [],
    Permission: [],
    RolePermission: [],
    Department: [],
    Profession: [],
    StaffProfile: [],
    ShiftType: [],
    StaffingRequirement: [],
    Roster: [],
    ShiftAssignment: [],
    LeaveRequest: [],
  }
}

export function createInMemoryPrisma() {
  const tables = emptyTables()
  const queries: QueryCall[] = []
  const failCreates: Array<{ model: ModelName; error?: unknown }> = []
  const publicOrm = createPublicOrm(tables, queries, failCreates)

  function snapshotTables() {
    return {
      User: tables.User.map((row) => ({ ...row })),
      Organization: tables.Organization.map((row) => ({ ...row })),
      OrganizationMember: tables.OrganizationMember.map((row) => ({ ...row })),
      OrganizationSchedulingPolicy: tables.OrganizationSchedulingPolicy.map((row) => ({ ...row })),
      Role: tables.Role.map((row) => ({ ...row })),
      Permission: tables.Permission.map((row) => ({ ...row })),
      RolePermission: tables.RolePermission.map((row) => ({ ...row })),
      Department: tables.Department.map((row) => ({ ...row })),
      Profession: tables.Profession.map((row) => ({ ...row })),
      StaffProfile: tables.StaffProfile.map((row) => ({ ...row })),
      ShiftType: tables.ShiftType.map((row) => ({ ...row })),
      StaffingRequirement: tables.StaffingRequirement.map((row) => ({ ...row })),
      Roster: tables.Roster.map((row) => ({ ...row })),
      ShiftAssignment: tables.ShiftAssignment.map((row) => ({ ...row })),
      LeaveRequest: tables.LeaveRequest.map((row) => ({ ...row })),
    }
  }

  function restoreTables(snapshot: Record<ModelName, Row[]>) {
    for (const model of MODEL_NAMES) {
      tables[model].length = 0
      tables[model].push(...snapshot[model])
    }
  }

  return {
    db: {
      orm: {
        public: publicOrm,
      },
      async transaction<T>(
        fn: (tx: { orm: { public: typeof publicOrm } }) => Promise<T>,
      ) {
        const snapshot = snapshotTables()

        try {
          return await fn({
            orm: {
              public: publicOrm,
            },
          })
        } catch (error) {
          restoreTables(snapshot)
          throw error
        }
      },
    },
    tables,
    queries,
    insert(model: ModelName, row: Row) {
      tables[model].push(row)
      return row
    },
    failNextCreate(model: ModelName, error?: unknown) {
      failCreates.push({ model, error })
    },
    reset() {
      for (const model of MODEL_NAMES) {
        tables[model].length = 0
      }
      queries.length = 0
      failCreates.length = 0
    },
  }
}

export const memory = createInMemoryPrisma()

export type InMemoryPrisma = ReturnType<typeof createInMemoryPrisma>
