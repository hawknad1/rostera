import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { SwapList } from "@/modules/shift-swaps/ui/swap-list"
import { getSwapCapabilities, listSwaps } from "@/modules/shift-swaps/services/swaps"

export default async function ShiftSwapsPage() {
  await requirePermission(permissions.shiftSwapView)
  const [swaps, capabilities] = await Promise.all([listSwaps(), getSwapCapabilities()])
  const departments = [
    ...new Map(swaps.map((row) => [row.departmentId, { id: row.departmentId, name: row.departmentName }])).values(),
  ]

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Shift swaps</h1>
          <p className="text-sm text-muted-foreground">
            {capabilities.isStaffSelfService
              ? "Your swap requests. Pending requests can be cancelled until they are reviewed."
              : "Organization swap requests. Approval exchanges the two assignments after fresh schedule validation."}
          </p>
        </div>
        {capabilities.canRequest ? (
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/shift-swaps/new"
          >
            Request swap
          </Link>
        ) : null}
      </div>

      {capabilities.isStaffSelfService && !capabilities.ownStaffId ? (
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a staff record, so you cannot request or view shift swaps yet.
        </p>
      ) : swaps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shift swap requests have been recorded yet.</p>
      ) : (
        <SwapList departments={departments} swaps={swaps} />
      )}
    </main>
  )
}
