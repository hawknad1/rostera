import type { db } from "@/prisma/db"

import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"

type PublicOrm = typeof db.orm

type AuthUserIdentity = {
  id: string
  email?: string | null
  phone?: string | null
}

export async function syncAuthenticatedUser(orm: PublicOrm, authUser: AuthUserIdentity) {
  const existing = await orm.public.User.where({
    authProviderId: authUser.id,
  }).first()

  if (existing) {
    return existing
  }

  try {
    return await orm.public.User.create({
      authProviderId: authUser.id,
      ...(authUser.email ? { email: authUser.email } : {}),
      ...(authUser.phone ? { phone: authUser.phone } : {}),
    })
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      throw error
    }

    const raced = await orm.public.User.where({
      authProviderId: authUser.id,
    }).first()

    if (!raced) {
      throw error
    }

    return raced
  }
}
