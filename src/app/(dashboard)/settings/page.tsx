import Link from "next/link"

import { hasPermission } from "@/lib/auth/has-permission"
import { requireOrganization } from "@/lib/auth/require-organization"
import { permissions } from "@/lib/permissions/permissions"
import { getConfiguredChannelAvailability } from "@/modules/notifications/providers/registry"

export default async function SettingsPage() {
  const membership = await requireOrganization()
  const channels = getConfiguredChannelAvailability()
  const [
    canViewOrganization,
    canViewUsers,
    canViewInvitations,
    canViewRoles,
    canViewSettings,
    canViewDeliveries,
  ] = await Promise.all([
    hasPermission(membership, permissions.organizationView),
    hasPermission(membership, permissions.usersView),
    hasPermission(membership, permissions.usersView),
    hasPermission(membership, permissions.rolesView),
    hasPermission(membership, permissions.settingsView),
    hasPermission(membership, permissions.notificationsView),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Organization administration, access, and operational policy.
        </p>
      </div>

      {canViewOrganization ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Organization</h2>
          <p className="text-sm text-muted-foreground">
            Identity, contact details, timezone, and organization status.
          </p>
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/settings/organization"
          >
            Organization settings
          </Link>
        </section>
      ) : null}

      {canViewUsers || canViewInvitations || canViewRoles ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Users & access</h2>
          <p className="text-sm text-muted-foreground">
            Memberships, invitations, and roles. Application accounts are separate from workforce
            profiles.
          </p>
          <div className="flex flex-col gap-1">
            {canViewUsers ? (
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                href="/settings/users"
              >
                Users
              </Link>
            ) : null}
            {canViewInvitations ? (
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                href="/settings/invitations"
              >
                Invitations
              </Link>
            ) : null}
            {canViewRoles ? (
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                href="/settings/roles"
              >
                Roles & permissions
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {canViewSettings ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Scheduling</h2>
          <p className="text-sm text-muted-foreground">
            Rest, weekly hours, consecutive days, night shifts, and weekend limits.
          </p>
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/settings/scheduling"
          >
            Scheduling policy
          </Link>
        </section>
      ) : null}

      {canViewSettings ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Attendance</h2>
          <p className="text-sm text-muted-foreground">
            Clock-in rules and exception thresholds. Policy changes do not rewrite historical attendance.
          </p>
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/settings/attendance"
          >
            Attendance policy
          </Link>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Provider credentials stay in the server environment. Channel configuration is shown below.
        </p>
        <dl className="grid max-w-md grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Email</dt>
            <dd>{channels.email ? "Configured" : "Not configured"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>SMS</dt>
            <dd>{channels.sms ? "Configured" : "Not configured"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>WhatsApp</dt>
            <dd>{channels.whatsapp ? "Configured" : "Not configured"}</dd>
          </div>
        </dl>
        <Link
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          href="/me/notifications/preferences"
        >
          Notification preferences
        </Link>
        {canViewDeliveries ? (
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/notifications/deliveries"
          >
            Delivery history
          </Link>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Account</h2>
        <p className="text-sm text-muted-foreground">
          Your application profile. Sign-in credentials are managed by authentication.
        </p>
        <Link
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          href="/settings/account"
        >
          Account
        </Link>
      </section>
    </main>
  )
}
