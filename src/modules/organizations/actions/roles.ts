"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { OrganizationAdminError } from "@/modules/organizations/errors"
import {
  createCustomRoleInputSchema,
  roleIdInputSchema,
  updateCustomRoleInputSchema,
} from "@/modules/organizations/schemas/admin"
import {
  createCustomRole,
  deactivateCustomRole,
  updateCustomRole,
} from "@/modules/organizations/services/roles"

export type RoleActionState = { ok: false; error: string } | { ok: true } | null

function fromError(error: unknown): RoleActionState {
  if (error instanceof OrganizationAdminError) {
    return { ok: false, error: error.message }
  }

  return { ok: false, error: "Unable to update the role. Please try again." }
}

export async function createCustomRoleAction(
  _previous: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const parsed = createCustomRoleInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    permissionKeys: formData.getAll("permissionKeys"),
  })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the role details." }
  }

  try {
    const role = await createCustomRole(parsed.data)
    revalidatePath("/settings/roles")
    redirect(`/settings/roles/${role.id}`)
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error
    }

    return fromError(error)
  }
}

export async function updateCustomRoleAction(
  _previous: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const parsed = updateCustomRoleInputSchema.safeParse({
    roleId: formData.get("roleId"),
    name: formData.get("name"),
    description: formData.get("description"),
    permissionKeys: formData.getAll("permissionKeys"),
  })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the role details." }
  }

  try {
    await updateCustomRole(parsed.data)
  } catch (error) {
    return fromError(error)
  }

  revalidatePath("/settings/roles")
  revalidatePath(`/settings/roles/${parsed.data.roleId}`)
  return { ok: true }
}

export async function deactivateCustomRoleAction(formData: FormData): Promise<void> {
  const parsed = roleIdInputSchema.safeParse(Object.fromEntries(formData.entries()))

  if (!parsed.success) {
    return
  }

  await deactivateCustomRole(parsed.data)
  revalidatePath("/settings/roles")
  revalidatePath(`/settings/roles/${parsed.data.roleId}`)
}
