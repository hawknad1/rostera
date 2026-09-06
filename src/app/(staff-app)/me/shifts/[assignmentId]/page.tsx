import { Temporal } from "temporal-polyfill"
import { notFound } from "next/navigation"

import { StaffAppError } from "@/modules/staff-app/errors"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { getStaffShift } from "@/modules/staff-app/services/shifts"
import { StaffShiftDetailView } from "@/modules/staff-app/ui/staff-shift-detail"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function StaffShiftDetailPage({
  params,
}: PageProps<"/me/shifts/[assignmentId]">) {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const { assignmentId } = await params
  let shift

  try {
    shift = await getStaffShift(assignmentId)
  } catch (error) {
    if (error instanceof StaffAppError && error.code === "NOT_FOUND") {
      notFound()
    }

    throw error
  }

  return (
    <StaffShiftDetailView
      cachedAt={Temporal.Now.instant().toString()}
      identity={identity}
      shift={shift}
    />
  )
}
