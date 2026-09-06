"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { SchedulingPolicyError } from "@/modules/organizations/errors"
import { updateSchedulingPolicy } from "@/modules/organizations/services/scheduling-policy"
import { updateSchedulingPolicyFormSchema } from "@/modules/scheduling/schemas/scheduling-policy"

export type SchedulingPolicyActionState =
  | { ok: false; error: string }
  | { ok: true }
  | null

export async function updateSchedulingPolicyAction(
  _previousState: SchedulingPolicyActionState,
  formData: FormData,
): Promise<SchedulingPolicyActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = updateSchedulingPolicyFormSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the scheduling policy values.",
    }
  }

  try {
    await updateSchedulingPolicy(parsed.data)
    revalidatePath("/settings")
    revalidatePath("/settings/scheduling")
    revalidatePath("/rosters")
    return { ok: true }
  } catch (error) {
    if (error instanceof SchedulingPolicyError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message }
    }

    return {
      ok: false,
      error: "Unable to update the scheduling policy. Please try again.",
    }
  }
}
