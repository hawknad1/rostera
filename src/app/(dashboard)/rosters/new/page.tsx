import Link from "next/link"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { listRosterFormOptions } from "@/modules/rosters/services/rosters"
import { CreateRosterForm } from "@/modules/rosters/ui/create-roster-form"

export default async function NewRosterPage() {
  await requirePermission(permissions.rosterCreate)
  const options = await listRosterFormOptions()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/rosters"
        >
          Back to rosters
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Create roster</h1>
        <p className="text-sm text-muted-foreground">
          Create a draft roster for one department and a date range. Assignments can be added after
          the roster is created.
        </p>
      </div>

      {options.departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create at least one department before creating a roster.
        </p>
      ) : (
        <CreateRosterForm
          departments={options.departments.map((department) => ({
            id: department.id,
            name: department.name,
          }))}
        />
      )}
    </main>
  )
}
