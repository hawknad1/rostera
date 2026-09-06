import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"
import { DISABLED_SCHEDULING_POLICY } from "@/modules/scheduling/types/scheduling-policy"
import type { SchedulingPolicyValues } from "@/modules/scheduling/types/scheduling-policy"
import { db } from "@/prisma/db"

type PublicOrm = typeof db.orm

export type OrganizationSchedulingPolicyRecord = SchedulingPolicyValues & {
  id: string
  organizationId: string
}

function asNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return value
  }

  return null
}

export function toSchedulingPolicyRecord(row: {
  id: unknown
  organizationId: unknown
  minimumRestMinutes?: unknown
  maximumWeeklyMinutes?: unknown
  maximumConsecutiveDays?: unknown
  maximumNightShiftsPerWeek?: unknown
  maximumWeekendShifts?: unknown
}): OrganizationSchedulingPolicyRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    minimumRestMinutes: asNullableInteger(row.minimumRestMinutes),
    maximumWeeklyMinutes: asNullableInteger(row.maximumWeeklyMinutes),
    maximumConsecutiveDays: asNullableInteger(row.maximumConsecutiveDays),
    maximumNightShiftsPerWeek: asNullableInteger(row.maximumNightShiftsPerWeek),
    maximumWeekendShifts: asNullableInteger(row.maximumWeekendShifts),
  }
}

export async function ensureDefaultSchedulingPolicy(orm: PublicOrm, organizationId: string) {
  const existing = await orm.public.OrganizationSchedulingPolicy.where({
    organizationId,
  }).first()

  if (existing) {
    return toSchedulingPolicyRecord(existing)
  }

  try {
    const created = await orm.public.OrganizationSchedulingPolicy.create({
      organizationId,
      ...DISABLED_SCHEDULING_POLICY,
    })
    return toSchedulingPolicyRecord(created)
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      throw error
    }

    const raced = await orm.public.OrganizationSchedulingPolicy.where({
      organizationId,
    }).first()

    if (!raced) {
      throw error
    }

    return toSchedulingPolicyRecord(raced)
  }
}
