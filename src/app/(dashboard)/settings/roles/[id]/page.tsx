import { notFound } from "next/navigation"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { deactivateCustomRoleAction } from "@/modules/organizations/actions/roles"
import { OrganizationAdminError } from "@/modules/organizations/errors"
import { getRoleDetail } from "@/modules/organizations/services/roles"
import { ConfirmSubmit } from "@/modules/organizations/ui/confirm-submit"
import { RoleForm } from "@/modules/organizations/ui/role-form"

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const membership = await requirePermission(permissions.rolesView)
  const { id } = await params

  let detail
  try {
    detail = await getRoleDetail(id)
  } catch (error) {
    if (error instanceof OrganizationAdminError && error.code === "NOT_FOUND") {
      notFound()
    }
    throw error
  }

  const [canEdit, canDeactivate] = await Promise.all([
    hasPermission(membership, permissions.rolesEdit),
    hasPermission(membership, permissions.rolesDeactivate),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{detail.role.name}</h1>
        <p className="text-sm text-muted-foreground">
          {detail.role.isSystem ? "System role" : "Custom role"} ·{" "}
          {detail.role.isActive === false ? "Inactive" : "Active"} · {detail.memberCount} active members
        </p>
        {detail.role.description ? (
          <p className="text-sm text-muted-foreground">{String(detail.role.description)}</p>
        ) : null}
      </div>

      {detail.role.isSystem || !canEdit ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Permissions</h2>
          <ul className="columns-1 gap-x-8 text-sm sm:columns-2">
            {detail.permissionKeys.map((key) => (
              <li className="mb-1" key={key}>
                {key}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <RoleForm
          catalog={detail.catalog}
          role={{
            id: detail.role.id,
            name: detail.role.name,
            description: detail.role.description ? String(detail.role.description) : null,
          }}
          selectedKeys={detail.permissionKeys}
        />
      )}

      {canDeactivate && !detail.role.isSystem && detail.role.isActive !== false ? (
        <form action={deactivateCustomRoleAction}>
          <input name="roleId" type="hidden" value={detail.role.id} />
          <ConfirmSubmit
            className="text-sm font-medium text-destructive underline-offset-4 hover:underline"
            message="Deactivate this role? Members with this role will no longer receive its permissions."
          >
            Deactivate role
          </ConfirmSubmit>
        </form>
      ) : null}
    </main>
  )
}
