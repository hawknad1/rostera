import { ALL_PERMISSIONS } from "@/modules/organizations/default-roles"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { RoleForm } from "@/modules/organizations/ui/role-form"

export default async function NewRolePage() {
  await requirePermission(permissions.rolesCreate)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create custom role</h1>
        <p className="text-sm text-muted-foreground">
          Custom roles belong to this organization and can be edited or deactivated later.
        </p>
      </div>
      <RoleForm catalog={ALL_PERMISSIONS} selectedKeys={[]} />
    </main>
  )
}
