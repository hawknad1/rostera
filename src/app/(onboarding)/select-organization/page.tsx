import Link from "next/link"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { resolveMembership } from "@/lib/auth/get-current-membership"
import { switchOrganizationFormAction } from "@/modules/organizations/actions/switch-organization"
import { selectClassName } from "@/modules/organizations/ui/form-styles"

export default async function SelectOrganizationPage() {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const resolved = await resolveMembership()

  if (resolved.status === "no_membership") {
    redirect("/onboarding")
  }

  if (resolved.status === "ready") {
    redirect("/dashboard")
  }

  if (resolved.status === "suspended") {
    redirect("/organization-suspended")
  }

  const memberships = resolved.status === "needs_selection" ? resolved.memberships : []

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Select organization</h1>
        <p className="text-sm text-muted-foreground">
          You belong to more than one organization. Choose which one to work in.
        </p>
      </div>

      <form action={switchOrganizationFormAction} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="organizationId">
          Organization
        </label>
        <select className={selectClassName} id="organizationId" name="organizationId" required>
          {memberships.map((membership) => (
            <option key={membership.organizationId} value={membership.organizationId}>
              {String(membership.organization.name)}
            </option>
          ))}
        </select>
        <button
          className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
          type="submit"
        >
          Continue
        </button>
      </form>

      <p className="text-sm">
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/onboarding?create=1"
        >
          Create another organization
        </Link>
      </p>
    </main>
  )
}
