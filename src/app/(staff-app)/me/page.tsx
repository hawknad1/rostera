import { Temporal } from "temporal-polyfill"

import { StaffAppError } from "@/modules/staff-app/errors"
import { getStaffHome } from "@/modules/staff-app/services/home"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { StaffHomeView } from "@/modules/staff-app/ui/staff-home-view"
import { UnlinkedStaffState } from "@/modules/staff-app/ui/staff-status"

export default async function StaffHomePage() {
  const identity = await resolveStaffIdentity()

  if (identity.status === "UNLINKED") {
    return <UnlinkedStaffState />
  }

  let home

  try {
    home = await getStaffHome()
  } catch (error) {
    if (error instanceof StaffAppError && error.code === "STAFF_NOT_LINKED") {
      home = null
    } else {
      throw error
    }
  }

  if (!home) {
    return <UnlinkedStaffState />
  }

  return <StaffHomeView cachedAt={Temporal.Now.instant().toString()} home={home} />
}
