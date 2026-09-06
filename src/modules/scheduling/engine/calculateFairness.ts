import type { SchedulingContext } from "@/modules/scheduling/types/scheduling-context"

export type FairnessResult = {
  readonly implemented: false
}

export function calculateFairness(context: SchedulingContext): FairnessResult {
  void context
  return { implemented: false }
}
