import type { ConstraintKind } from "@/modules/scheduling/types/scheduling-conflict"

export type NightShiftLimitConfig = {
  maximumPerWeek: number
  constraint: ConstraintKind
}

export type WeekendLimitConfig = {
  maximumShifts: number
  constraint: ConstraintKind
}

export type SchedulingConfig = {
  minimumRestMinutes?: number | null
  maximumWeeklyMinutes?: number | null
  maximumConsecutiveDays?: number | null
  maximumNightShiftsPerWeek?: number | null
  maximumWeekendShifts?: number | null
  nightShiftLimit?: NightShiftLimitConfig
  weekendLimit?: WeekendLimitConfig
}
