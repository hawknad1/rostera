import { consecutiveShiftsRule } from "@/modules/scheduling/rules/consecutiveShifts"
import { leaveConflictRule } from "@/modules/scheduling/rules/leaveConflict"
import { maximumHoursRule } from "@/modules/scheduling/rules/maximumHours"
import { nightShiftLimitRule } from "@/modules/scheduling/rules/nightShiftLimit"
import { overlapRule } from "@/modules/scheduling/rules/overlap"
import { qualificationRule } from "@/modules/scheduling/rules/qualification"
import { restPeriodRule } from "@/modules/scheduling/rules/restPeriod"
import { staffingRequirementRule } from "@/modules/scheduling/rules/staffingRequirement"
import { weekendLimitRule } from "@/modules/scheduling/rules/weekendLimit"
import type { SchedulingRule } from "@/modules/scheduling/types/scheduling-rule"

export const defaultSchedulingRules: SchedulingRule[] = [
  overlapRule,
  leaveConflictRule,
  restPeriodRule,
  maximumHoursRule,
  consecutiveShiftsRule,
  qualificationRule,
  staffingRequirementRule,
  nightShiftLimitRule,
  weekendLimitRule,
]
