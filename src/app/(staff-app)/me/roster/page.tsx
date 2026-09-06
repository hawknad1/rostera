import { Temporal } from "temporal-polyfill"

import { getStaffPublishedRoster } from "@/modules/staff-app/services/roster"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { StaffRosterList } from "@/modules/staff-app/ui/staff-roster-list"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function StaffRosterPage() {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  const roster = await getStaffPublishedRoster()

  return (
    <StaffRosterList
      assignments={roster.assignments}
      cachedAt={Temporal.Now.instant().toString()}
      identity={roster.identity}
      rosters={roster.rosters}
    />
  )
}
