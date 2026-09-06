import { swapError } from "@/modules/shift-swaps/errors"
import { isSwapStatus, type SwapStatus } from "@/modules/shift-swaps/labels"

const allowedTransitions: Record<SwapStatus, readonly SwapStatus[]> = {
  PENDING: ["APPROVED", "COMPLETED", "REJECTED", "CANCELLED"],
  APPROVED: ["COMPLETED"],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
}

export function assertSwapTransition(from: string, to: SwapStatus) {
  if (!isSwapStatus(from)) {
    throw swapError("SWAP_NOT_PENDING")
  }

  if (allowedTransitions[from].includes(to)) {
    return
  }

  if (from !== "PENDING") {
    throw swapError("SWAP_NOT_PENDING")
  }

  throw swapError("FAILED")
}
