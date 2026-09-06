import { z } from "zod"

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

function toRequiredCount(value: unknown) {
  if (typeof value === "number") {
    return value
  }

  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return undefined
  }

  if (!/^\d+$/.test(trimmed)) {
    return trimmed
  }

  return Number(trimmed)
}

const requiredId = (label: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string(`${label} is required.`).trim().min(1, `${label} is required.`),
  )

const requiredCountField = z.preprocess(
  toRequiredCount,
  z
    .number("Required count is required.")
    .int("Required count must be a whole number.")
    .min(1, "Required count must be at least 1.")
    .max(100, "Required count cannot exceed 100."),
)

export const createStaffingRequirementInputSchema = z.object({
  departmentId: requiredId("Department"),
  shiftTypeId: requiredId("Shift"),
  professionId: requiredId("Profession"),
  requiredCount: requiredCountField,
})

export const updateStaffingRequirementInputSchema = createStaffingRequirementInputSchema.extend({
  id: z.string().trim().min(1, "Staffing requirement is required."),
})

export const staffingRequirementIdInputSchema = z.object({
  id: z.string().trim().min(1, "Staffing requirement is required."),
})

export type CreateStaffingRequirementInput = z.output<typeof createStaffingRequirementInputSchema>
export type UpdateStaffingRequirementInput = z.output<typeof updateStaffingRequirementInputSchema>
export type StaffingRequirementIdInput = z.output<typeof staffingRequirementIdInputSchema>
