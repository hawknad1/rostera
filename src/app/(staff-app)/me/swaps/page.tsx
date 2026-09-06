import Link from "next/link"

import { swapStatusLabels } from "@/modules/shift-swaps/labels"
import { listSwaps } from "@/modules/shift-swaps/services/swaps"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function StaffSwapsPage() {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const swaps = (await listSwaps()).filter(
    (swap) =>
      swap.requesterStaffId === identity.staff.id || swap.targetStaffId === identity.staff.id,
  )

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Swaps</h1>
          <p className="text-sm text-muted-foreground">
            Swap requests are not roster changes until they are approved.
          </p>
        </div>
        {identity.canMutate ? (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/me/swaps/new"
          >
            Request swap
          </Link>
        ) : null}
      </header>

      {swaps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No swap requests.</p>
      ) : (
        <ul className="flex flex-col">
          {swaps.map((swap) => (
            <li className="border-b border-border py-3 last:border-b-0" key={swap.id}>
              <Link
                className="flex min-h-12 flex-col gap-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                href={`/me/swaps/${swap.id}`}
              >
                <span className="text-sm font-medium">{swapStatusLabels[swap.status]}</span>
                <span className="text-sm text-muted-foreground">
                  {swap.sourceDateLabel} · {swap.sourceShiftName}
                </span>
                <span className="text-sm text-muted-foreground">
                  with {swap.targetStaffName} · {swap.targetShiftName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
