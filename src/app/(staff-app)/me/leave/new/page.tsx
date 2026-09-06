import Link from "next/link"

import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { StaffLeaveForm } from "@/modules/staff-app/ui/staff-leave-form"
import { TerminatedStaffNotice, UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function NewStaffLeavePage() {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/me/leave"
        >
          Back to leave
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Request leave</h1>
        <p className="text-sm text-muted-foreground">
          Leave dates are calendar days, inclusive. This is a request until it is reviewed.
        </p>
      </div>
      {identity.canMutate ? <StaffLeaveForm /> : <TerminatedStaffNotice />}
    </div>
  )
}
