import type { SchedulingConfig } from "@/modules/scheduling/types/scheduling-config"
import type { SchedulingPolicyValues } from "@/modules/scheduling/types/scheduling-policy"

export function toSchedulingConfig(policy: SchedulingPolicyValues): SchedulingConfig {
  return {
    minimumRestMinutes: policy.minimumRestMinutes,
    maximumWeeklyMinutes: policy.maximumWeeklyMinutes,
    maximumConsecutiveDays: policy.maximumConsecutiveDays,
    maximumNightShiftsPerWeek: policy.maximumNightShiftsPerWeek,
    maximumWeekendShifts: policy.maximumWeekendShifts,
    nightShiftLimit:
      policy.maximumNightShiftsPerWeek === null
        ? undefined
        : {
            maximumPerWeek: policy.maximumNightShiftsPerWeek,
            constraint: "HARD",
          },
    weekendLimit:
      policy.maximumWeekendShifts === null
        ? undefined
        : {
            maximumShifts: policy.maximumWeekendShifts,
            constraint: "HARD",
          },
  }
}
