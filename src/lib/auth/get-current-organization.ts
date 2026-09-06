import { getCurrentMembership } from "./get-current-membership"

export async function getCurrentOrganization() {
  const membership = await getCurrentMembership()

  if (!membership) {
    return null
  }

  return membership.organization
}

export type CurrentOrganization = NonNullable<
  Awaited<ReturnType<typeof getCurrentOrganization>>
>
