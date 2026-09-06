import Link from "next/link"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { listRosterFormOptions, listRosters } from "@/modules/rosters/services/rosters"
import { RosterList } from "@/modules/rosters/ui/roster-list"

export default async function RostersPage() {
  const membership = await requirePermission(permissions.rosterView)
  const [rosters, options, canCreate, canEdit] = await Promise.all([
    listRosters(),
    listRosterFormOptions(),
    hasPermission(membership, permissions.rosterCreate),
    hasPermission(membership, permissions.rosterEdit),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Rosters</h1>
          <p className="text-sm text-muted-foreground">
            Department duty rosters and manual shift assignments for this hospital.
          </p>
        </div>
        {canCreate ? (
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/rosters/new"
          >
            Create roster
          </Link>
        ) : null}
      </div>

      {rosters.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rosters have been created yet.</p>
      ) : (
        <RosterList
          canEdit={canEdit}
          departments={options.departments.map((department) => ({
            id: department.id,
            name: department.name,
          }))}
          rosters={rosters}
        />
      )}
    </main>
  )
}
