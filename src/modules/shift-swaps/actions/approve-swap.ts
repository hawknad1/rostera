"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { SwapError } from "@/modules/shift-swaps/errors"
import { swapIdInputSchema } from "@/modules/shift-swaps/schemas/swap"
import { approveSwap } from "@/modules/shift-swaps/services/approve-swap"

export type SwapReviewActionState = {
  ok: false
  error: string
  code?: string
  conflicts?: Array<{ message: string }>
} | null

export async function approveSwapAction(
  _previousState: SwapReviewActionState,
  formData: FormData,
): Promise<SwapReviewActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = swapIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Swap request is required.",
    }
  }

  try {
    const swap = await approveSwap(parsed.data.id)
    revalidatePath("/shift-swaps")
    revalidatePath(`/shift-swaps/${swap.id}`)
    revalidatePath("/rosters")
    return null
  } catch (error) {
    if (error instanceof SwapError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return {
        ok: false,
        error: error.message,
        code: error.code,
        conflicts: error.conflicts?.map((conflict) => ({ message: conflict.message })),
      }
    }

    return {
      ok: false,
      error: "Unable to approve this swap request. Please try again.",
    }
  }
}
