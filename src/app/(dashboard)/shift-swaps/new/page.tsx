import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { CreateSwapForm } from "@/modules/shift-swaps/ui/create-swap-form"
import { listSwapFormOptions } from "@/modules/shift-swaps/services/swaps"

export default async function NewShiftSwapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission(permissions.shiftSwapRequest)
  const params = await searchParams
  const sourceAssignmentId =
    typeof params.sourceAssignmentId === "string" ? params.sourceAssignmentId : undefined
  const options = await listSwapFormOptions()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/shift-swaps"
        >
          Back to shift swaps
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Request a swap</h1>
        <p className="text-sm text-muted-foreground">
          Nominate another eligible staff member who already has an assignment on the same roster.
          The swap will only take effect after approval and successful schedule validation.
        </p>
      </div>

      {!options.linked ? (
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a staff record. Ask an administrator to link it before
          requesting a swap.
        </p>
      ) : options.ownAssignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You do not have any assignments that can be swapped yet.
        </p>
      ) : (
        <CreateSwapForm
          candidatesBySourceId={options.candidatesBySourceId}
          defaultSourceAssignmentId={sourceAssignmentId}
          ownAssignments={options.ownAssignments}
        />
      )}
    </main>
  )
}
