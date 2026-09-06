import { z } from "zod"

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const optionalDescription = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
)

export const createDepartmentInputSchema = z.object({
  name: z.preprocess(
    emptyToUndefined,
    z.string("Department name is required.").trim().min(1, "Department name is required."),
  ),
  description: optionalDescription,
})

export const updateDepartmentInputSchema = createDepartmentInputSchema.extend({
  id: z.string().trim().min(1, "Department is required."),
})

export const departmentIdInputSchema = z.object({
  id: z.string().trim().min(1, "Department is required."),
})

export type CreateDepartmentInput = z.output<typeof createDepartmentInputSchema>
export type UpdateDepartmentInput = z.output<typeof updateDepartmentInputSchema>
export type DepartmentIdInput = z.output<typeof departmentIdInputSchema>
