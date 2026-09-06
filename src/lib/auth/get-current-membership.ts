import { db } from "@/prisma/db"

import { getCurrentUser } from "./get-current-user"

export async function getCurrentMembership() {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const membership = await db.orm.public.OrganizationMember.where({
    userId: user.id,
    status: "ACTIVE",
  })
    .include("organization")
    .include("role")
    .first()

  if (!membership) {
    return null
  }

  if (membership.role.organizationId !== membership.organizationId) {
    return null
  }

  return membership
}

export type CurrentMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>
