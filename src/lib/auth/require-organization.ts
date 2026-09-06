import { redirect } from "next/navigation"

import {
  resolveMembership,
  type CurrentMembership,
} from "./get-current-membership"

export async function requireOrganization(
  options: { allowSuspended?: boolean } = {},
): Promise<CurrentMembership> {
  const resolved = await resolveMembership()

  switch (resolved.status) {
    case "unauthenticated":
      redirect("/login")
    case "no_membership":
      redirect("/onboarding")
    case "needs_selection":
      redirect("/select-organization")
    case "suspended":
      if (options.allowSuspended) {
        return resolved.membership
      }
      redirect("/organization-suspended")
    case "ready":
      return resolved.membership
  }
}
