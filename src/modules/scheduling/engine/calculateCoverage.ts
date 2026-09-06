import { enumerateCalendarDates } from "@/lib/dates/calendar-date"

export type CoverageStatus = "understaffed" | "covered" | "overstaffed"

export type CoverageRequirement = {
  shiftTypeId: string
  professionId: string
  requiredCount: number
}

export type CoverageAssignment = {
  date: string
  shiftTypeId: string
  professionId: string
}

export type CoverageCell = {
  date: string
  shiftTypeId: string
  professionId: string
  requiredCount: number
  assignedCount: number
  shortfall: number
  surplus: number
  status: CoverageStatus
}

function cellKey(date: string, shiftTypeId: string, professionId: string) {
  return `${date}|${shiftTypeId}|${professionId}`
}

function coverageStatus(requiredCount: number, assignedCount: number): CoverageStatus {
  if (assignedCount < requiredCount) {
    return "understaffed"
  }

  if (assignedCount > requiredCount) {
    return "overstaffed"
  }

  return "covered"
}

function toCell(
  date: string,
  shiftTypeId: string,
  professionId: string,
  requiredCount: number,
  assignedCount: number,
): CoverageCell {
  return {
    date,
    shiftTypeId,
    professionId,
    requiredCount,
    assignedCount,
    shortfall: Math.max(0, requiredCount - assignedCount),
    surplus: Math.max(0, assignedCount - requiredCount),
    status: coverageStatus(requiredCount, assignedCount),
  }
}

export function calculateCoverage(input: {
  startDate: string
  endDate: string
  requirements: CoverageRequirement[]
  assignments: CoverageAssignment[]
}): CoverageCell[] {
  const dates = enumerateCalendarDates(input.startDate, input.endDate)
  const assignedCounts = new Map<string, number>()

  for (const assignment of input.assignments) {
    const key = cellKey(assignment.date, assignment.shiftTypeId, assignment.professionId)
    assignedCounts.set(key, (assignedCounts.get(key) ?? 0) + 1)
  }

  const cells: CoverageCell[] = []
  const seen = new Set<string>()

  for (const date of dates) {
    for (const requirement of input.requirements) {
      const key = cellKey(date, requirement.shiftTypeId, requirement.professionId)
      seen.add(key)
      cells.push(
        toCell(
          date,
          requirement.shiftTypeId,
          requirement.professionId,
          requirement.requiredCount,
          assignedCounts.get(key) ?? 0,
        ),
      )
    }
  }

  for (const [key, assignedCount] of assignedCounts) {
    if (seen.has(key)) {
      continue
    }

    const [date, shiftTypeId, professionId] = key.split("|")
    if (!date || !shiftTypeId || !professionId) {
      continue
    }

    if (date < input.startDate || date > input.endDate) {
      continue
    }

    cells.push(toCell(date, shiftTypeId, professionId, 0, assignedCount))
  }

  return cells.sort((left, right) => {
    const date = left.date.localeCompare(right.date)
    if (date !== 0) {
      return date
    }

    const shift = left.shiftTypeId.localeCompare(right.shiftTypeId)
    if (shift !== 0) {
      return shift
    }

    return left.professionId.localeCompare(right.professionId)
  })
}
