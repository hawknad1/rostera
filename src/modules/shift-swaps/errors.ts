import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"

export const swapErrorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "SWAP_NOT_FOUND",
  "SWAP_NOT_PENDING",
  "SWAP_NOT_YOURS",
  "SWAP_ASSIGNMENTS_MISMATCH",
  "SWAP_ROSTER_MISMATCH",
  "SWAP_REQUIRES_DRAFT_ROSTER",
  "SWAP_ASSIGNMENT_ALREADY_IN_SWAP",
  "SWAP_STATE_CHANGED",
  "SWAP_REQUIRES_AMENDMENT",
  "SWAP_STAFF_INACTIVE",
  "SWAP_NOT_ELIGIBLE",
  "SWAP_SCHEDULING_CONFLICT",
  "SWAP_APPROVAL_FAILED",
  "STAFF_NOT_LINKED",
  "FAILED",
] as const

export type SwapErrorCode = (typeof swapErrorCodes)[number]

export class SwapError extends Error {
  readonly code: SwapErrorCode
  readonly conflicts?: SchedulingConflict[]

  constructor(code: SwapErrorCode, message: string, conflicts?: SchedulingConflict[]) {
    super(message)
    this.name = "SwapError"
    this.code = code
    this.conflicts = conflicts
  }
}

export function isSwapError(error: unknown): error is SwapError {
  return error instanceof SwapError
}

export const swapErrorMessages: Record<SwapErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in to manage shift swaps.",
  FORBIDDEN: "You do not have permission to perform this action.",
  SWAP_NOT_FOUND: "Shift swap request not found.",
  SWAP_NOT_PENDING: "Only pending swap requests can be changed.",
  SWAP_NOT_YOURS: "You can only request a swap for your own assignment.",
  SWAP_ASSIGNMENTS_MISMATCH: "The nominated staff member does not own that assignment.",
  SWAP_ROSTER_MISMATCH: "Both assignments must belong to the same roster.",
  SWAP_REQUIRES_DRAFT_ROSTER: "This swap can only be completed while the roster is a draft.",
  SWAP_ASSIGNMENT_ALREADY_IN_SWAP: "One of these assignments is already in a pending swap.",
  SWAP_STATE_CHANGED: "This swap can no longer be completed because the roster or assignments changed.",
  SWAP_REQUIRES_AMENDMENT:
    "Published roster assignments cannot be swapped. Create a roster amendment, then complete the swap on the new draft version.",
  SWAP_STAFF_INACTIVE: "A staff member in this swap is not active.",
  SWAP_NOT_ELIGIBLE: "The nominated staff member is not eligible for this swap.",
  SWAP_SCHEDULING_CONFLICT: "This swap would violate scheduling rules.",
  SWAP_APPROVAL_FAILED: "Unable to complete this swap. Please try again.",
  STAFF_NOT_LINKED: "Your account is not linked to a staff record.",
  FAILED: "Unable to complete this swap action. Please try again.",
}

export function swapError(code: SwapErrorCode, conflicts?: SchedulingConflict[]) {
  return new SwapError(code, swapErrorMessages[code], conflicts)
}
