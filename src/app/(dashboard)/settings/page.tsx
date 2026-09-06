import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"

export default async function SettingsPage() {
  await requirePermission(permissions.settingsView)

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
    </main>
  )
}
