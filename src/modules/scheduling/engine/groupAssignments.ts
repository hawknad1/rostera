import type { SchedulingAssignment } from "@/modules/scheduling/types/scheduling-context"

export function groupAssignmentsByStaffId(assignments: SchedulingAssignment[]) {
  const grouped = new Map<string, SchedulingAssignment[]>()

  for (const assignment of assignments) {
    const existing = grouped.get(assignment.staffId)
    if (existing) {
      existing.push(assignment)
      continue
    }

    grouped.set(assignment.staffId, [assignment])
  }

  return grouped
}

export function assignmentsForStaff(assignments: SchedulingAssignment[], staffId: string) {
  return assignments.filter((assignment) => assignment.staffId === staffId)
}

export function rosterAssignments(
  assignments: SchedulingAssignment[],
  rosterId: string,
) {
  return assignments.filter((assignment) => assignment.rosterId === rosterId)
}
