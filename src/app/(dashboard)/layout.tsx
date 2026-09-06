import type { ReactNode } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { ensureDefaultRoleGrants } from "@/modules/organizations/ensure-permissions"
import { ensureDefaultSchedulingPolicy } from "@/modules/organizations/services/ensure-scheduling-policy"
import { db } from "@/prisma/db"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/login")
  }

  const membership = await getCurrentMembership()

  if (!membership) {
    redirect("/onboarding")
  }

  await ensureDefaultRoleGrants(db.orm, membership.organizationId)
  await ensureDefaultSchedulingPolicy(db.orm, membership.organizationId)

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="text-sm font-medium text-foreground">
            {String(membership.organization.name)}
          </p>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href="/rosters"
            >
              Rosters
            </Link>
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href="/staff"
            >
              Staff
            </Link>
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href="/shifts"
            >
              Shifts
            </Link>
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href="/departments"
            >
              Departments
            </Link>
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href="/professions"
            >
              Professions
            </Link>
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href="/settings"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
