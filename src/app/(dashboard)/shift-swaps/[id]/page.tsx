import Link from "next/link"
import { notFound } from "next/navigation"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { SwapError } from "@/modules/shift-swaps/errors"
import { swapStatusLabels } from "@/modules/shift-swaps/labels"
import { SwapReviewActions } from "@/modules/shift-swaps/ui/swap-review-actions"
import { getSwap, getSwapCapabilities } from "@/modules/shift-swaps/services/swaps"

function formatInstant(value: unknown) {
  if (!value) {
    return null
  }

  const raw = String(value)
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? raw.slice(0, 10)
}

export default async function ShiftSwapDetailPage({
  params,
}: PageProps<"/shift-swaps/[id]">) {
  const { id } = await params
  await requirePermission(permissions.shiftSwapView)

  let swap
  try {
    swap = await getSwap(id)
  } catch (error) {
    if (error instanceof SwapError && error.code === "SWAP_NOT_FOUND") {
      notFound()
    }
    throw error
  }

  const capabilities = await getSwapCapabilities()
  const isOwnRequest = capabilities.ownStaffId === swap.requesterStaffId
  const canCancel = swap.status === "PENDING" && isOwnRequest && capabilities.canRequest

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/shift-swaps"
        >
          Back to shift swaps
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Swap request</h1>
        <p className="text-sm text-muted-foreground">
          {swap.rosterName} · {swap.departmentName} · {swapStatusLabels[swap.status]}
        </p>
      </div>

      <section className="grid gap-6 sm:grid-cols-2">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Requester</dt>
            <dd>{swap.requesterName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Current shift</dt>
            <dd>
              {swap.sourceDateLabel}
              <p className="text-muted-foreground">
                {swap.sourceShiftName} · {swap.sourceTimeLabel}
              </p>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Proposed staff</dt>
            <dd>{swap.targetStaffName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Their shift</dt>
            <dd>
              {swap.targetDateLabel}
              <p className="text-muted-foreground">
                {swap.targetShiftName} · {swap.targetTimeLabel}
              </p>
            </dd>
          </div>
        </dl>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{swapStatusLabels[swap.status]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Requested by</dt>
            <dd>{swap.requestedByLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reviewed by</dt>
            <dd>{swap.reviewedByLabel ?? "Not reviewed"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reviewed on</dt>
            <dd>{formatInstant(swap.reviewedAt) ?? "Not reviewed"}</dd>
          </div>
        </dl>
      </section>

      {swap.reason ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Reason</h2>
          <p className="text-sm">{swap.reason}</p>
        </section>
      ) : null}

      {swap.reviewNotes ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Review notes</h2>
          <p className="text-sm">{swap.reviewNotes}</p>
        </section>
      ) : null}

      {swap.status === "PENDING" && swap.blockers.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Cannot approve</h2>
          <ul className="list-disc pl-5 text-sm text-destructive">
            {swap.blockers.map((conflict) => (
              <li key={`${conflict.code}-${conflict.assignmentId}-${conflict.date}`}>
                {conflict.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {swap.status === "PENDING" && swap.warnings.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Warnings</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {swap.warnings.map((conflict) => (
              <li key={`${conflict.code}-${conflict.assignmentId}-${conflict.date}`}>
                {conflict.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SwapReviewActions
        canApprove={swap.status === "PENDING" && capabilities.canApprove}
        canCancel={canCancel}
        canReject={swap.status === "PENDING" && capabilities.canReject}
        status={swap.status}
        swapId={swap.id}
      />
    </main>
  )
}
