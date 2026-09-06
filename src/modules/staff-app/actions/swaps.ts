"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { StaffAppError } from "@/modules/staff-app/errors"
import { requireMutableStaff } from "@/modules/staff-app/services/identity"
import { SwapError } from "@/modules/shift-swaps/errors"
import { createSwapInputSchema, swapIdInputSchema } from "@/modules/shift-swaps/schemas/swap"
import { cancelSwap } from "@/modules/shift-swaps/services/cancel-swap"
import { createSwap } from "@/modules/shift-swaps/services/create-swap"

export type StaffSwapActionState = {
  ok: false
  error: string
  code?: string
} | null

function revalidateStaffSwaps() {
  revalidatePath("/me")
  revalidatePath("/me/swaps")
  revalidatePath("/shift-swaps")
}

export async function createStaffSwapAction(
  _previousState: StaffSwapActionState,
  formData: FormData,
): Promise<StaffSwapActionState> {
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
    await requireMutableStaff()
    swap = await createSwap(parsed.data)
  } catch (error) {
    if (error instanceof StaffAppError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message, code: error.code }
    }

    if (error instanceof SwapError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message, code: error.code }
    }

    return {
      ok: false,
      error: "Unable to create the swap request. Please try again.",
    }
  }

  revalidateStaffSwaps()
  revalidatePath(`/me/swaps/${swap.id}`)
  redirect(`/me/swaps/${swap.id}`)
}

export async function cancelStaffSwapAction(
  _previousState: StaffSwapActionState,
  formData: FormData,
): Promise<StaffSwapActionState> {
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
    await requireMutableStaff()
    const swap = await cancelSwap(parsed.data.id)
    revalidateStaffSwaps()
    revalidatePath(`/me/swaps/${swap.id}`)
    return null
  } catch (error) {
    if (error instanceof StaffAppError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message, code: error.code }
    }

    if (error instanceof SwapError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/login")
      }

      return { ok: false, error: error.message, code: error.code }
    }

    return {
      ok: false,
      error: "Unable to cancel this swap request. Please try again.",
    }
  }
}
