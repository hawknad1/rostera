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

export const createProfessionInputSchema = z.object({
  name: z.preprocess(
    emptyToUndefined,
    z.string("Profession name is required.").trim().min(1, "Profession name is required."),
  ),
  description: optionalDescription,
})

export const updateProfessionInputSchema = createProfessionInputSchema.extend({
  id: z.string().trim().min(1, "Profession is required."),
})

export const professionIdInputSchema = z.object({
  id: z.string().trim().min(1, "Profession is required."),
})

export type CreateProfessionInput = z.output<typeof createProfessionInputSchema>
export type UpdateProfessionInput = z.output<typeof updateProfessionInputSchema>
export type ProfessionIdInput = z.output<typeof professionIdInputSchema>
