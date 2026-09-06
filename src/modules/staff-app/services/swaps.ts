import { selectCurrentPublishedRosters } from "@/modules/rosters/services/versions"
import { requireLinkedStaff, requireMutableStaff } from "@/modules/staff-app/services/identity"
import { listSwapFormOptions } from "@/modules/shift-swaps/services/swaps"
import { db } from "@/prisma/db"

export async function listStaffSwapOptions() {
  const identity = await requireLinkedStaff()
  const options = await listSwapFormOptions()

  if (!options.linked) {
    return options
  }

  const rosters = await db.orm.public.Roster.where({
    organizationId: identity.staff.organizationId,
  }).all()
  const publishedIds = new Set(
    selectCurrentPublishedRosters(
      rosters.filter((row) => row.organizationId === identity.staff.organizationId),
    ).map((roster) => String(roster.id)),
  )

  const ownAssignments = options.ownAssignments.filter((assignment) =>
    publishedIds.has(assignment.rosterId),
  )
  const candidatesBySourceId: typeof options.candidatesBySourceId = {}
  for (const assignment of ownAssignments) {
    candidatesBySourceId[assignment.id] = options.candidatesBySourceId[assignment.id] ?? []
  }

  return {
    ...options,
    ownAssignments,
    candidatesBySourceId,
    canMutate: identity.canMutate,
  }
}

export async function assertStaffCanRequestSwap() {
  await requireMutableStaff()
}
