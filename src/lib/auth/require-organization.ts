import { redirect } from "next/navigation"

import {
  getCurrentMembership,
  type CurrentMembership,
} from "./get-current-membership"

export async function requireOrganization(): Promise<CurrentMembership> {
  const membership = await getCurrentMembership()

  if (!membership) {
    redirect("/login")
  }

  return membership
}
