import { z } from "zod"

export const employmentStatuses = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"] as const
export const employmentTypes = ["FULL_TIME", "PART_TIME", "CONTRACT", "LOCUM", "CASUAL"] as const

export type EmploymentStatus = (typeof employmentStatuses)[number]
export type EmploymentType = (typeof employmentTypes)[number]

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

function emptyToNull(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional())
const optionalTextOrNull = z.preprocess(emptyToNull, z.union([z.string().trim().min(1), z.null()]).optional())

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.email("Enter a valid email address.").optional(),
)
const optionalEmailOrNull = z.preprocess(
  emptyToNull,
  z.union([z.email("Enter a valid email address."), z.null()]).optional(),
)

const optionalPhotoUrl = z.preprocess(
  emptyToUndefined,
  z.url("Enter a valid photo URL.").optional(),
)
const optionalPhotoUrlOrNull = z.preprocess(
  emptyToNull,
  z.union([z.url("Enter a valid photo URL."), z.null()]).optional(),
)

const dateJoinedPattern = /^\d{4}-\d{2}-\d{2}$/

const optionalDateJoined = z.preprocess(
  emptyToUndefined,
  z.string().regex(dateJoinedPattern, "Enter a valid date.").optional(),
)
const optionalDateJoinedOrNull = z.preprocess(
  emptyToNull,
  z.union([z.string().regex(dateJoinedPattern, "Enter a valid date."), z.null()]).optional(),
)

const requiredName = (label: string) =>
  z.preprocess(emptyToUndefined, z.string(`${label} is required.`).trim().min(1, `${label} is required.`))

export const createStaffInputSchema = z.object({
  firstName: requiredName("First name"),
  middleName: optionalText,
  lastName: requiredName("Last name"),
  staffNumber: requiredName("Staff number"),
  phone: optionalText,
  email: optionalEmail,
  professionId: z.preprocess(
    emptyToUndefined,
    z.string("Profession is required.").trim().min(1, "Profession is required."),
  ),
  departmentId: z.preprocess(
    emptyToUndefined,
    z.string("Department is required.").trim().min(1, "Department is required."),
  ),
  employmentStatus: z.preprocess(
    (value) => emptyToUndefined(value) ?? "ACTIVE",
    z.enum(employmentStatuses),
  ),
  employmentType: z.preprocess(
    (value) => emptyToUndefined(value) ?? "FULL_TIME",
    z.enum(employmentTypes),
  ),
  dateJoined: optionalDateJoined,
  photoUrl: optionalPhotoUrl,
})

export const updateStaffInputSchema = z.object({
  id: z.string().trim().min(1, "Staff member is required."),
  firstName: requiredName("First name"),
  middleName: optionalTextOrNull,
  lastName: requiredName("Last name"),
  phone: optionalTextOrNull,
  email: optionalEmailOrNull,
  professionId: z.preprocess(
    emptyToUndefined,
    z.string("Profession is required.").trim().min(1, "Profession is required."),
  ),
  departmentId: z.preprocess(
    emptyToUndefined,
    z.string("Department is required.").trim().min(1, "Department is required."),
  ),
  employmentStatus: z.enum(employmentStatuses, "Employment status is required."),
  employmentType: z.enum(employmentTypes, "Employment type is required."),
  dateJoined: optionalDateJoinedOrNull,
  photoUrl: optionalPhotoUrlOrNull,
})

export const staffIdInputSchema = z.object({
  id: z.string().trim().min(1, "Staff member is required."),
})

export const assignDepartmentHeadInputSchema = z.object({
  departmentId: z.string().trim().min(1, "Department is required."),
  staffId: z.string().trim().min(1, "Staff member is required."),
})

export const departmentHeadInputSchema = z.object({
  departmentId: z.string().trim().min(1, "Department is required."),
})

export const linkStaffToUserInputSchema = z.object({
  staffId: z.string().trim().min(1, "Staff member is required."),
  userId: z.string().trim().min(1, "User is required."),
})

export type CreateStaffInput = z.output<typeof createStaffInputSchema>
export type UpdateStaffInput = z.output<typeof updateStaffInputSchema>
export type StaffIdInput = z.output<typeof staffIdInputSchema>
export type AssignDepartmentHeadInput = z.output<typeof assignDepartmentHeadInputSchema>
export type DepartmentHeadInput = z.output<typeof departmentHeadInputSchema>
export const unlinkStaffFromUserInputSchema = z.object({
  staffId: z.string().trim().min(1, "Staff member is required."),
})

export type LinkStaffToUserInput = z.output<typeof linkStaffToUserInputSchema>
export type UnlinkStaffFromUserInput = z.output<typeof unlinkStaffFromUserInputSchema>
