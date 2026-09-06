"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { SwapError } from "@/modules/shift-swaps/errors"
import { createSwapInputSchema } from "@/modules/shift-swaps/schemas/swap"
import { createSwap } from "@/modules/shift-swaps/services/create-swap"

export type SwapActionState = {
  ok: false
  error: string
  code?: string
  conflicts?: Array<{ message: string }>
} | null

export async function createSwapAction(
  _previousState: SwapActionState,
  formData: FormData,
): Promise<SwapActionState> {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const parsed = createSwapInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the swap details.",
    }
  }

  let swap

  try {
    swap = await createSwap(parsed.data)
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
      error: "Unable to create the swap request. Please try again.",
    }
  }

  revalidatePath("/shift-swaps")
  redirect(`/shift-swaps/${swap.id}`)
}
