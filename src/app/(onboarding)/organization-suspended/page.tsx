import { redirect } from "next/navigation"

import { hasPermission } from "@/lib/auth/has-permission"
import { getAuthUser } from "@/lib/auth/get-auth-user"
import { resolveMembership } from "@/lib/auth/get-current-membership"
import { permissions } from "@/lib/permissions/permissions"
import { reactivateOrganizationAction } from "@/modules/organizations/actions/organization"
import { ConfirmSubmit } from "@/modules/organizations/ui/confirm-submit"

export default async function OrganizationSuspendedPage() {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const resolved = await resolveMembership()

  if (resolved.status === "no_membership") {
    redirect("/onboarding")
  }

  if (resolved.status === "needs_selection") {
    redirect("/select-organization")
  }

  if (resolved.status === "ready") {
    redirect("/dashboard")
  }

  if (resolved.status !== "suspended") {
    redirect("/login")
  }

  const membership = resolved.membership
  const canReactivate = await hasPermission(membership, permissions.organizationSuspend)

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Organization suspended</h1>
        <p className="text-sm text-muted-foreground">
          {String(membership.organization.name)} is suspended. Operational access is blocked until an
          administrator reactivates it. Existing records are preserved.
        </p>
      </div>

      {canReactivate ? (
        <form action={reactivateOrganizationAction}>
          <ConfirmSubmit
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            message="Reactivate this organization and restore operational access?"
          >
            Reactivate organization
          </ConfirmSubmit>
        </form>
      ) : null}
    </main>
  )
}
