import { sortConflicts } from "@/modules/scheduling/engine/sortConflicts"
import { defaultSchedulingRules } from "@/modules/scheduling/rules"
import type { SchedulingResult } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingContext } from "@/modules/scheduling/types/scheduling-context"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

export function detectConflicts(
  context: SchedulingContext,
  rules: SchedulingRule[] = defaultSchedulingRules,
): SchedulingResult {
  const conflicts = sortConflicts(rules.flatMap((rule) => rule.evaluate(context)))

  return {
    valid: !conflicts.some((conflict) => conflict.blocking),
    conflicts,
  }
}
