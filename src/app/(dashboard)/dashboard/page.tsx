import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"

export default async function DashboardPage() {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const membership = await getCurrentMembership()

  if (!membership) {
    redirect("/onboarding")
  }

  return (
    <main>
      <h1>Rostera Dashboard</h1>

      <p>You are authenticated.</p>

      <p>{String(membership.organization.name)}</p>
    </main>
  )
}
