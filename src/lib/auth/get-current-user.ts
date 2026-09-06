import { db } from "@/prisma/db"

import { getAuthUser } from "./get-auth-user"

export async function getCurrentUser() {
  const authUser = await getAuthUser()

  if (!authUser) {
    return null
  }

  return db.orm.public.User.where({ authProviderId: authUser.id }).first()
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
