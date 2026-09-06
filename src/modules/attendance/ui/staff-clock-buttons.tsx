"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  clockInAction,
  type AttendancePunchState,
} from "@/modules/attendance/actions/clock-in"
import {
  clockOutAction,
} from "@/modules/attendance/actions/clock-out"
import { OfflineMutationNotice, useOfflineSubmitGuard } from "@/modules/staff-app/ui/offline-mutation"

export function StaffClockButtons({
  canClockIn,
  canClockOut,
}: {
  canClockIn: boolean
  canClockOut: boolean
}) {
  const [inState, inAction, inPending] = useActionState<AttendancePunchState, FormData>(
    clockInAction,
    null,
  )
  const [outState, outAction, outPending] = useActionState<AttendancePunchState, FormData>(
    clockOutAction,
    null,
  )
  const { online, message } = useOfflineSubmitGuard()
  const pending = inPending || outPending
  const error = inState?.error ?? outState?.error

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <OfflineMutationNotice />
      {canClockIn ? (
        <form action={inAction}>
          <Button disabled={pending || !online} size="lg" type="submit">
            {inPending ? "Clocking in..." : "Clock in"}
          </Button>
        </form>
      ) : null}
      {canClockOut ? (
        <form action={outAction}>
          <Button disabled={pending || !online} size="lg" type="submit">
            {outPending ? "Clocking out..." : "Clock out"}
          </Button>
        </form>
      ) : null}
      {!online && message ? <span className="sr-only">{message}</span> : null}
    </div>
  )
}
