import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"

import { OnboardingForm } from "./onboarding-form"

export default async function OnboardingPage() {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const membership = await getCurrentMembership()

  if (membership) {
    redirect("/dashboard")
  }

  return <OnboardingForm />
}
