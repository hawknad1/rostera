import Link from "next/link"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { getConfiguredChannelAvailability } from "@/modules/notifications/providers/registry"

export default async function SettingsPage() {
  const membership = await requirePermission(permissions.settingsView)
  const channels = getConfiguredChannelAvailability()
  const canViewDeliveries = await hasPermission(membership, permissions.notificationsView)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Organization configuration for rostering. These settings are not a claim of legal
          compliance.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Scheduling policy</h2>
        <p className="text-sm text-muted-foreground">
          Configure rest, weekly hours, consecutive days, night shifts, and weekend limits used when
          assigning staff and validating rosters.
        </p>
        <Link
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          href="/settings/scheduling"
        >
          Open scheduling policy
        </Link>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Provider credentials stay in the server environment. This page only shows whether a
          channel is configured.
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
        {canViewDeliveries ? (
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/notifications/deliveries"
          >
            Open delivery history
          </Link>
        ) : null}
      </section>
    </main>
  )
}
