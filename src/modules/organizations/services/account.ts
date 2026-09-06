import { getCurrentUser } from "@/lib/auth/get-current-user"
import { organizationAdminError } from "@/modules/organizations/errors"
import type { UpdateAccountInput } from "@/modules/organizations/schemas/admin"
import { db } from "@/prisma/db"

export async function updateAccountProfile(input: UpdateAccountInput) {
  const user = await getCurrentUser()

  if (!user) {
    throw organizationAdminError("UNAUTHENTICATED")
  }

  const updated = await db.orm.public.User.where({ id: user.id }).update({
    displayName: input.displayName ?? null,
    phone: input.phone ?? null,
  })

  if (!updated) {
    throw organizationAdminError("NOT_FOUND")
  }

  return updated
}
