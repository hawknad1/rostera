export type SchedulingPolicyValues = {
  minimumRestMinutes: number | null
  maximumWeeklyMinutes: number | null
  maximumConsecutiveDays: number | null
  maximumNightShiftsPerWeek: number | null
  maximumWeekendShifts: number | null
}

export const DISABLED_SCHEDULING_POLICY: SchedulingPolicyValues = {
  minimumRestMinutes: null,
  maximumWeeklyMinutes: null,
  maximumConsecutiveDays: null,
  maximumNightShiftsPerWeek: null,
  maximumWeekendShifts: null,
}

export function isSchedulingConstraintEnabled(
  value: number | null | undefined,
): value is number {
  return typeof value === "number"
}
