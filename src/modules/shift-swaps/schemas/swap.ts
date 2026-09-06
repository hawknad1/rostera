import { z } from "zod"

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const optionalText = (max: number, message: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(max, message).optional(),
  )

export const createSwapInputSchema = z.object({
  sourceAssignmentId: z.string().trim().min(1, "Your shift is required."),
  targetAssignmentId: z.string().trim().min(1, "The shift to swap with is required."),
  reason: optionalText(2000, "Reason must be 2000 characters or fewer."),
})

export const swapIdInputSchema = z.object({
  id: z.string().trim().min(1, "Swap request is required."),
})

export const rejectSwapInputSchema = z.object({
  id: z.string().trim().min(1, "Swap request is required."),
  reviewNotes: optionalText(2000, "Rejection reason must be 2000 characters or fewer."),
})

export type CreateSwapInput = z.output<typeof createSwapInputSchema>
export type SwapIdInput = z.output<typeof swapIdInputSchema>
export type RejectSwapInput = z.output<typeof rejectSwapInputSchema>
