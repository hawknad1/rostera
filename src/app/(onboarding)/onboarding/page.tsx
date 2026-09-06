import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { resolveMembership } from "@/lib/auth/get-current-membership"

import { OnboardingForm } from "./onboarding-form"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const params = await searchParams
  const creating = params.create === "1"
  const resolved = await resolveMembership()

  if (!creating) {
    if (resolved.status === "ready") {
      redirect("/dashboard")
    }

    if (resolved.status === "needs_selection") {
      redirect("/select-organization")
    }

    if (resolved.status === "suspended") {
      redirect("/organization-suspended")
    }
  }

  return <OnboardingForm />
}
