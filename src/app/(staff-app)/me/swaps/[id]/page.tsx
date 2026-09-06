import Link from "next/link"
import { notFound } from "next/navigation"

import { SwapError } from "@/modules/shift-swaps/errors"
import { swapStatusLabels } from "@/modules/shift-swaps/labels"
import { getSwap } from "@/modules/shift-swaps/services/swaps"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { StaffCancelSwapButton } from "@/modules/staff-app/ui/staff-cancel-swap"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function StaffSwapDetailPage({ params }: PageProps<"/me/swaps/[id]">) {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const { id } = await params
  let swap

  try {
    swap = await getSwap(id)
  } catch (error) {
    if (error instanceof SwapError && error.code === "SWAP_NOT_FOUND") {
      notFound()
    }

    throw error
  }

  const isOwn =
    swap.requesterStaffId === identity.staff.id || swap.targetStaffId === identity.staff.id

  if (!isOwn) {
    notFound()
  }

  const canCancel =
    identity.canMutate &&
    swap.status === "PENDING" &&
    swap.requesterStaffId === identity.staff.id

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/me/swaps"
        >
          Back to swaps
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Swap request</h1>
        <p className="text-sm text-muted-foreground">{swapStatusLabels[swap.status]}</p>
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Your shift</dt>
          <dd>
            {swap.sourceDateLabel} · {swap.sourceShiftName} · {swap.sourceTimeLabel}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Swap with</dt>
          <dd>
            {swap.targetStaffName} · {swap.targetDateLabel} · {swap.targetShiftName} ·{" "}
            {swap.targetTimeLabel}
          </dd>
        </div>
        {swap.reason ? (
          <div>
            <dt className="text-muted-foreground">Reason</dt>
            <dd>{swap.reason}</dd>
          </div>
        ) : null}
      </dl>

      <p className="text-sm text-muted-foreground">
        A swap request does not change the published roster until it is approved. Published
        assignments still require a roster amendment before a swap can be completed.
      </p>

      {canCancel ? <StaffCancelSwapButton swapId={swap.id} /> : null}
    </div>
  )
}
