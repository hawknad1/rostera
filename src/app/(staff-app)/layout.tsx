import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import {
  getUserOrganizations,
  resolveMembership,
} from "@/lib/auth/get-current-membership"
import { ensureDefaultAttendancePolicy } from "@/modules/attendance/services/policy"
import { getUnreadNotificationCount } from "@/modules/notifications/services/notifications"
import { ensureDefaultRoleGrants } from "@/modules/organizations/ensure-permissions"
import { ensureDefaultSchedulingPolicy } from "@/modules/organizations/services/ensure-scheduling-policy"
import { OrganizationSwitcher } from "@/modules/organizations/ui/organization-switcher"
import { resolveStaffIdentity } from "@/modules/staff-app/services/identity"
import { OfflineBanner } from "@/modules/staff-app/ui/offline-banner"
import { StaffNav } from "@/modules/staff-app/ui/staff-nav"
import { StaffPwaRegister } from "@/modules/staff-app/ui/staff-pwa-register"
import { db } from "@/prisma/db"

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
  viewportFit: "cover",
} as const

export const metadata = {
  title: "Rostera",
  applicationName: "Rostera",
  appleWebApp: {
    capable: true,
    title: "Rostera",
    statusBarStyle: "default" as const,
  },
}

export default async function StaffAppLayout({ children }: { children: ReactNode }) {
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

  if (resolved.status === "suspended") {
    redirect("/organization-suspended")
  }

  if (resolved.status !== "ready") {
    redirect("/login")
  }

  const membership = resolved.membership
  const organizations = await getUserOrganizations()

  await ensureDefaultRoleGrants(db.orm, membership.organizationId)
  await ensureDefaultSchedulingPolicy(db.orm, membership.organizationId)
  await ensureDefaultAttendancePolicy(db.orm, membership.organizationId)

  const [identity, unreadCount] = await Promise.all([
    resolveStaffIdentity(),
    getUnreadNotificationCount(),
  ])

  const userId = identity.user.id
  const organizationId = membership.organizationId
  const timeZone = String(membership.organization.timezone)

  return (
    <div className="flex min-h-full flex-col bg-background">
      <StaffPwaRegister />
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-lg items-baseline justify-between gap-3 px-4 py-3 md:max-w-3xl">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Rostera
            </p>
            <p className="text-sm font-medium text-foreground">
              {String(membership.organization.name)}
            </p>
            <OrganizationSwitcher membership={membership} organizations={organizations} />
          </div>
        </div>
        <OfflineBanner organizationId={organizationId} timeZone={timeZone} userId={userId} />
      </header>
      <div className="hidden md:block">
        <StaffNav unreadCount={unreadCount} />
      </div>
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-24 md:max-w-3xl md:pb-10">
        {children}
      </div>
      <div className="md:hidden">
        <StaffNav unreadCount={unreadCount} />
      </div>
    </div>
  )
}
