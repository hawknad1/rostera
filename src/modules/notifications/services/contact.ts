import { normalizeE164, normalizeEmail } from "@/modules/notifications/phone"
import type { PublicOrm } from "@/modules/notifications/types/orm"

export type RecipientContact = {
  email: string | null
  phone: string | null
}

export async function resolveRecipientContact(
  orm: PublicOrm,
  input: { organizationId: string; recipientUserId: string },
): Promise<RecipientContact> {
  const user = await orm.public.User.where({ id: input.recipientUserId }).first()
  const staff = await orm.public.StaffProfile.where({
    organizationId: input.organizationId,
    userId: input.recipientUserId,
  }).first()

  const email =
    normalizeEmail(user?.email == null ? null : String(user.email)) ??
    normalizeEmail(staff?.email == null ? null : String(staff.email))
  const phone =
    normalizeE164(user?.phone == null ? null : String(user.phone)) ??
    normalizeE164(staff?.phone == null ? null : String(staff.phone))

  return { email, phone }
}

export function destinationForChannel(
  channel: "EMAIL" | "SMS" | "WHATSAPP",
  contact: RecipientContact,
) {
  if (channel === "EMAIL") {
    return contact.email
  }

  return contact.phone
}
