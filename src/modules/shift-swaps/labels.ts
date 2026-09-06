export const swapStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
] as const

export type SwapStatus = (typeof swapStatuses)[number]

export const swapStatusLabels: Record<SwapStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
}

export function isSwapStatus(value: string): value is SwapStatus {
  return Object.hasOwn(swapStatusLabels, value)
}
