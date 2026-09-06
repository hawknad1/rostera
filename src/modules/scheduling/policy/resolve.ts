import type { ConstraintKind } from "@/modules/scheduling/types/scheduling-conflict"
import type { SchedulingConfig } from "@/modules/scheduling/types/scheduling-config"
import {
  DISABLED_SCHEDULING_POLICY,
  type SchedulingPolicyValues,
} from "@/modules/scheduling/types/scheduling-policy"

export function resolveSchedulingPolicy(
  config: SchedulingConfig | undefined,
): SchedulingPolicyValues {
  const source = config ?? {}

  return {
    minimumRestMinutes: source.minimumRestMinutes ?? null,
    maximumWeeklyMinutes: source.maximumWeeklyMinutes ?? null,
    maximumConsecutiveDays: source.maximumConsecutiveDays ?? null,
    maximumNightShiftsPerWeek:
      source.maximumNightShiftsPerWeek !== undefined
        ? source.maximumNightShiftsPerWeek
        : (source.nightShiftLimit?.maximumPerWeek ?? null),
    maximumWeekendShifts:
      source.maximumWeekendShifts !== undefined
        ? source.maximumWeekendShifts
        : (source.weekendLimit?.maximumShifts ?? null),
  }
}

export function resolveNightShiftConstraint(config: SchedulingConfig | undefined): ConstraintKind {
  return config?.nightShiftLimit?.constraint ?? "HARD"
}

export function resolveWeekendConstraint(config: SchedulingConfig | undefined): ConstraintKind {
  return config?.weekendLimit?.constraint ?? "HARD"
}

export function emptySchedulingConfig(): SchedulingConfig {
  return {
    ...DISABLED_SCHEDULING_POLICY,
  }
}
