import Link from "next/link"
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Rostera Dashboard</h1>
      <p className="text-sm text-muted-foreground">{String(membership.organization.name)}</p>
      <p className="text-sm">
        <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/me">
          Open staff workplace
        </Link>
      </p>
    </main>
  )
}
