import type { ConstraintKind } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConflict } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingContext } from "@/modules/scheduling/types/scheduling-context"

export interface SchedulingRule {
  readonly id: string
  readonly constraint: ConstraintKind
  evaluate(context: SchedulingContext): SchedulingConflict[]
}
