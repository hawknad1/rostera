import Link from "next/link"

import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { listStaffSwapOptions } from "@/modules/staff-app/services/swaps"
import { StaffSwapForm } from "@/modules/staff-app/ui/staff-swap-form"
import { TerminatedStaffNotice, UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function NewStaffSwapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const params = await searchParams
  const sourceAssignmentId =
    typeof params.sourceAssignmentId === "string" ? params.sourceAssignmentId : undefined
  const options = await listStaffSwapOptions()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/me/swaps"
        >
          Back to swaps
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Request swap</h1>
        <p className="text-sm text-muted-foreground">
          This request must be approved before the roster changes.
        </p>
      </div>

      {!identity.canMutate ? (
        <TerminatedStaffNotice />
      ) : options.ownAssignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You do not have a published assignment that can be offered for a swap.
        </p>
      ) : (
        <StaffSwapForm
          candidatesBySourceId={options.candidatesBySourceId}
          defaultSourceAssignmentId={sourceAssignmentId}
          ownAssignments={options.ownAssignments}
        />
      )}
    </div>
  )
}
