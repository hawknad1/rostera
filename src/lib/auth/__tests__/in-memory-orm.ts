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
  "OrganizationAttendancePolicy",
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
  "ShiftSwapRequest",
  "Notification",
  "NotificationOutbox",
  "NotificationDelivery",
  "NotificationPreference",
  "NotificationDeliveryReceipt",
  "AuditEvent",
  "AttendanceRecord",
  "AttendanceEvent",
  "AttendanceException",
  "OrganizationInvitation",
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
    model === "OrganizationInvitation" &&
    tables.OrganizationInvitation.some(
      (existing) => existing !== row && existing.tokenHash === row.tokenHash,
    )
  ) {
    throw uniqueViolation("organizationInvitation", "tokenHash")
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

  if (model === "Roster") {
    if (
      tables.Roster.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.seriesId === row.seriesId &&
          existing.versionNumber === row.versionNumber,
      )
    ) {
      throw uniqueViolation("roster", "series_version")
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

  if (
    model === "OrganizationAttendancePolicy" &&
    tables.OrganizationAttendancePolicy.some(
      (existing) => existing !== row && existing.organizationId === row.organizationId,
    )
  ) {
    throw uniqueViolation("organizationAttendancePolicy", "organizationId")
  }

  if (model === "AttendanceRecord") {
    if (
      row.openSessionKey != null &&
      tables.AttendanceRecord.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.staffId === row.staffId &&
          existing.openSessionKey === row.openSessionKey,
      )
    ) {
      throw uniqueViolation("attendanceRecord", "openSessionKey")
    }
  }

  if (model === "AttendanceEvent") {
    if (
      row.punchKey != null &&
      tables.AttendanceEvent.some(
        (existing) =>
          existing !== row &&
          existing.attendanceRecordId === row.attendanceRecordId &&
          existing.punchKey === row.punchKey,
      )
    ) {
      throw uniqueViolation("attendanceEvent", "punchKey")
    }
  }

  if (model === "Notification") {
    if (
      tables.Notification.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.recipientUserId === row.recipientUserId &&
          existing.type === row.type &&
          existing.eventId === row.eventId,
      )
    ) {
      throw uniqueViolation("notification", "idempotency")
    }
  }

  if (model === "NotificationOutbox") {
    if (
      tables.NotificationOutbox.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.eventType === row.eventType &&
          existing.eventId === row.eventId,
      )
    ) {
      throw uniqueViolation("notificationOutbox", "event")
    }
  }

  if (model === "NotificationDelivery") {
    if (
      tables.NotificationDelivery.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.eventType === row.eventType &&
          existing.eventId === row.eventId &&
          existing.recipientUserId === row.recipientUserId &&
          existing.channel === row.channel,
      )
    ) {
      throw uniqueViolation("notificationDelivery", "idempotency")
    }
  }

  if (model === "NotificationPreference") {
    if (
      tables.NotificationPreference.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.userId === row.userId &&
          existing.eventType === row.eventType &&
          existing.channel === row.channel,
      )
    ) {
      throw uniqueViolation("notificationPreference", "key")
    }
  }

  if (model === "NotificationDeliveryReceipt") {
    if (
      tables.NotificationDeliveryReceipt.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.provider === row.provider &&
          existing.providerEventId === row.providerEventId,
      )
    ) {
      throw uniqueViolation("notificationDeliveryReceipt", "event")
    }
  }

  if (model === "AuditEvent") {
    if (
      tables.AuditEvent.some(
        (existing) =>
          existing !== row &&
          existing.organizationId === row.organizationId &&
          existing.eventId === row.eventId,
      )
    ) {
      throw uniqueViolation("auditEvent", "event")
    }
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
      existing.rosterId === row.rosterId &&
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
    case "NotificationOutbox":
      return "notificationOutbox"
    case "NotificationDelivery":
      return "notificationDelivery"
    case "NotificationPreference":
      return "notificationPreference"
    case "NotificationDeliveryReceipt":
      return "notificationDeliveryReceipt"
    case "OrganizationAttendancePolicy":
      return "organizationAttendancePolicy"
    case "AttendanceRecord":
      return "attendanceRecord"
    case "AttendanceEvent":
      return "attendanceEvent"
    case "AttendanceException":
      return "attendanceException"
    case "OrganizationInvitation":
      return "organizationInvitation"
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
    row.organizationType ??= "HOSPITAL"
  }

  if (model === "Role") {
    row.isSystem ??= false
    row.isActive ??= true
  }

  if (model === "OrganizationInvitation") {
    row.status ??= "PENDING"
    row.acceptedAt ??= null
    row.acceptedByUserId ??= null
    row.createdAt ??= new Date().toISOString()
    row.updatedAt ??= row.createdAt
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
    row.seriesId ??= crypto.randomUUID()
    row.versionNumber ??= 1
    row.parentRosterId ??= null
    row.amendmentReason ??= null
  }

  if (model === "ShiftAssignment") {
    row.copiedFromAssignmentId ??= null
  }

  if (model === "LeaveRequest") {
    row.status ??= "PENDING"
  }

  if (model === "ShiftSwapRequest") {
    row.status ??= "PENDING"
  }

  if (model === "Notification") {
    row.readAt ??= null
    row.createdAt ??= new Date().toISOString()
    row.updatedAt ??= row.createdAt
  }

  if (model === "NotificationOutbox") {
    row.status ??= "PENDING"
    row.attempts ??= 0
    row.availableAt ??= new Date().toISOString()
    row.processedAt ??= null
    row.processingStartedAt ??= null
    row.lastError ??= null
    row.createdAt ??= new Date().toISOString()
    row.updatedAt ??= row.createdAt
  }

  if (model === "NotificationDelivery") {
    row.status ??= "PENDING"
    row.attemptCount ??= 0
    row.availableAt ??= new Date().toISOString()
    row.processingStartedAt ??= null
    row.sentAt ??= null
    row.deliveredAt ??= null
    row.failedAt ??= null
    row.lastError ??= null
    row.providerMessageId ??= null
    row.notificationId ??= null
    row.destination ??= null
    row.createdAt ??= new Date().toISOString()
    row.updatedAt ??= row.createdAt
  }

  if (model === "NotificationPreference") {
    row.createdAt ??= new Date().toISOString()
    row.updatedAt ??= row.createdAt
  }

  if (model === "NotificationDeliveryReceipt") {
    row.createdAt ??= new Date().toISOString()
  }

  if (model === "AuditEvent") {
    row.actorType ??= "USER"
    row.createdAt ??= new Date().toISOString()
  }

  if (model === "OrganizationAttendancePolicy") {
    row.attendanceEnabled ??= true
    row.lateThresholdMinutes ??= 0
    row.earlyDepartureThresholdMinutes ??= 0
    row.overtimeThresholdMinutes ??= 0
    row.allowUnscheduledAttendance ??= true
    row.allowEarlyClockIn ??= true
    row.maximumEarlyClockInMinutes ??= 120
    row.maximumLateClockOutMinutes ??= 720
    row.createdAt ??= new Date().toISOString()
    row.updatedAt ??= row.createdAt
  }

  if (model === "AttendanceRecord") {
    row.reviewStatus ??= "UNREVIEWED"
    row.lateMinutes ??= 0
    row.earlyDepartureMinutes ??= 0
    row.overtimeMinutes ??= 0
    row.createdAt ??= new Date().toISOString()
    row.updatedAt ??= row.createdAt
  }

  if (model === "AttendanceEvent") {
    row.createdAt ??= new Date().toISOString()
  }

  if (model === "AttendanceException") {
    row.status ??= "OPEN"
    row.createdAt ??= new Date().toISOString()
    row.updatedAt ??= row.createdAt
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

    if (includes.includes("user")) {
      result.user = tables.User.find((user) => user.id === row.userId) ?? null
    }
  }

  if (model === "OrganizationInvitation") {
    if (includes.includes("role")) {
      result.role = tables.Role.find((role) => role.id === row.roleId) ?? null
    }

    if (includes.includes("organization")) {
      result.organization =
        tables.Organization.find((organization) => organization.id === row.organizationId) ?? null
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
    OrganizationAttendancePolicy: createCollection(
      tables,
      queries,
      failCreates,
      "OrganizationAttendancePolicy",
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
    ShiftSwapRequest: createCollection(tables, queries, failCreates, "ShiftSwapRequest", {}, []),
    Notification: createCollection(tables, queries, failCreates, "Notification", {}, []),
    NotificationOutbox: createCollection(
      tables,
      queries,
      failCreates,
      "NotificationOutbox",
      {},
      [],
    ),
    NotificationDelivery: createCollection(
      tables,
      queries,
      failCreates,
      "NotificationDelivery",
      {},
      [],
    ),
    NotificationPreference: createCollection(
      tables,
      queries,
      failCreates,
      "NotificationPreference",
      {},
      [],
    ),
    NotificationDeliveryReceipt: createCollection(
      tables,
      queries,
      failCreates,
      "NotificationDeliveryReceipt",
      {},
      [],
    ),
    AuditEvent: createCollection(tables, queries, failCreates, "AuditEvent", {}, []),
    AttendanceRecord: createCollection(tables, queries, failCreates, "AttendanceRecord", {}, []),
    AttendanceEvent: createCollection(tables, queries, failCreates, "AttendanceEvent", {}, []),
    AttendanceException: createCollection(
      tables,
      queries,
      failCreates,
      "AttendanceException",
      {},
      [],
    ),
    OrganizationInvitation: createCollection(
      tables,
      queries,
      failCreates,
      "OrganizationInvitation",
      {},
      [],
    ),
  }
}

function emptyTables(): Record<ModelName, Row[]> {
  return {
    User: [],
    Organization: [],
    OrganizationMember: [],
    OrganizationSchedulingPolicy: [],
    OrganizationAttendancePolicy: [],
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
    ShiftSwapRequest: [],
    Notification: [],
    NotificationOutbox: [],
    NotificationDelivery: [],
    NotificationPreference: [],
    NotificationDeliveryReceipt: [],
    AuditEvent: [],
    AttendanceRecord: [],
    AttendanceEvent: [],
    AttendanceException: [],
    OrganizationInvitation: [],
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
      OrganizationAttendancePolicy: tables.OrganizationAttendancePolicy.map((row) => ({ ...row })),
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
      ShiftSwapRequest: tables.ShiftSwapRequest.map((row) => ({ ...row })),
      Notification: tables.Notification.map((row) => ({ ...row })),
      NotificationOutbox: tables.NotificationOutbox.map((row) => ({ ...row })),
      NotificationDelivery: tables.NotificationDelivery.map((row) => ({ ...row })),
      NotificationPreference: tables.NotificationPreference.map((row) => ({ ...row })),
      NotificationDeliveryReceipt: tables.NotificationDeliveryReceipt.map((row) => ({ ...row })),
      AuditEvent: tables.AuditEvent.map((row) => ({ ...row })),
      AttendanceRecord: tables.AttendanceRecord.map((row) => ({ ...row })),
      AttendanceEvent: tables.AttendanceEvent.map((row) => ({ ...row })),
      AttendanceException: tables.AttendanceException.map((row) => ({ ...row })),
      OrganizationInvitation: tables.OrganizationInvitation.map((row) => ({ ...row })),
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
      const next = withCreateDefaults(model, row)
      tables[model].push(next)
      return next
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
