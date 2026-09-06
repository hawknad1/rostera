"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { SwapError } from "@/modules/shift-swaps/errors"
import { rejectSwapInputSchema } from "@/modules/shift-swaps/schemas/swap"
import { rejectSwap } from "@/modules/shift-swaps/services/reject-swap"

export type SwapReviewActionState = {
  ok: false
  error: string
  code?: string
} | null

export async function rejectSwapAction(
  _previousState: SwapReviewActionState,
  formData: FormData,
): Promise<SwapReviewActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = rejectSwapInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Swap request is required.",
    }
  }

  try {
    const swap = await rejectSwap(parsed.data)
    revalidatePath("/shift-swaps")
    revalidatePath(`/shift-swaps/${swap.id}`)
    return null
  } catch (error) {
    if (error instanceof SwapError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message, code: error.code }
    }

    return {
      ok: false,
      error: "Unable to reject this swap request. Please try again.",
    }
  }
}
