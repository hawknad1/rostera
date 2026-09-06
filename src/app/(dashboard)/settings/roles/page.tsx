import Link from "next/link"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { listRolesWithUsage } from "@/modules/organizations/services/roles"

export default async function RolesPage() {
  const membership = await requirePermission(permissions.rolesView)
  const [roles, canCreate] = await Promise.all([
    listRolesWithUsage(),
    hasPermission(membership, permissions.rolesCreate),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Roles & permissions</h1>
          <p className="text-sm text-muted-foreground">
            System roles are protected. Custom roles belong to this organization.
          </p>
        </div>
        {canCreate ? (
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/settings/roles/new"
          >
            Create custom role
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Role</th>
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 font-medium">Members</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr className="border-b border-border" key={role.id}>
                <td className="py-3 pr-3">{role.name}</td>
                <td className="py-3 pr-3">{role.isSystem ? "System" : "Custom"}</td>
                <td className="py-3 pr-3">{role.memberCount}</td>
                <td className="py-3 pr-3">{role.isActive === false ? "Inactive" : "Active"}</td>
                <td className="py-3">
                  <Link
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    href={`/settings/roles/${role.id}`}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
