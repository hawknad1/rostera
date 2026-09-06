import Link from "next/link"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { getSchedulingPolicy } from "@/modules/organizations/services/scheduling-policy"
import { SchedulingPolicyForm } from "@/modules/organizations/ui/scheduling-policy-form"

export default async function SchedulingPolicySettingsPage() {
  const membership = await requirePermission(permissions.settingsView)
  const [policy, canEdit] = await Promise.all([
    getSchedulingPolicy(),
    hasPermission(membership, permissions.settingsEdit),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/settings"
        >
          Back to settings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Scheduling policy</h1>
        <p className="text-sm text-muted-foreground">
          These rules apply when creating assignments and when validating, submitting, or publishing
          a roster. They are organizational policy, not a statement of labor-law compliance.
          Published rosters stay unchanged.
        </p>
      </div>

      <SchedulingPolicyForm canEdit={canEdit} policy={policy} />
    </main>
  )
}
