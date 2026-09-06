import Link from "next/link"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { getAttendancePolicy } from "@/modules/attendance/services/policy-admin"
import { AttendancePolicyForm } from "@/modules/attendance/ui/policy-form"

export default async function AttendancePolicySettingsPage() {
  const membership = await requirePermission(permissions.settingsView)
  const [policy, canEdit] = await Promise.all([
    getAttendancePolicy(),
    hasPermission(membership, permissions.settingsEdit),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/settings">
          Back to settings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance policy</h1>
        <p className="text-sm text-muted-foreground">
          Thresholds and clock-in rules for this organization. Changing policy does not rewrite historical
          attendance snapshots.
        </p>
      </div>
      <AttendancePolicyForm canEdit={canEdit} policy={policy} />
    </main>
  )
}
