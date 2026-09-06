import Link from "next/link"

import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import {
  changeMembershipRoleFormAction,
  deactivateMembershipAction,
  linkMembershipStaffFormAction,
  reactivateMembershipAction,
  unlinkMembershipStaffAction,
} from "@/modules/organizations/actions/memberships"
import { membershipStatusLabels } from "@/modules/organizations/labels"
import {
  listMemberships,
  listOrganizationRoles,
  listUnlinkedActiveStaff,
} from "@/modules/organizations/services/memberships"
import { ConfirmSubmit } from "@/modules/organizations/ui/confirm-submit"
import { inputClassName, selectClassName } from "@/modules/organizations/ui/form-styles"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function UsersSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const membership = await requirePermission(permissions.usersView)
  const params = await searchParams
  const query = firstValue(params.q) ?? ""
  const roleId = firstValue(params.roleId) ?? ""
  const status = firstValue(params.status) ?? ""
  const linked = (firstValue(params.linked) ?? "") as "linked" | "unlinked" | ""
  const page = Number(firstValue(params.page) ?? "1") || 1

  const [result, roles, canEdit, canDeactivate, canLink] = await Promise.all([
    listMemberships({ page, query, roleId, status, linked }),
    listOrganizationRoles(),
    hasPermission(membership, permissions.usersEdit),
    hasPermission(membership, permissions.usersDeactivate),
    hasPermission(membership, permissions.staffEdit),
  ])
  const unlinkedStaff = canLink ? await listUnlinkedActiveStaff() : []

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Organization memberships. A Rostera account is separate from a workforce profile.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <input
          className={`${inputClassName} max-w-xs`}
          defaultValue={query}
          name="q"
          placeholder="Search name or email"
        />
        <select className={`${selectClassName} w-auto`} defaultValue={roleId} name="roleId">
          <option value="">All roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <select className={`${selectClassName} w-auto`} defaultValue={status} name="status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Deactivated</option>
        </select>
        <select className={`${selectClassName} w-auto`} defaultValue={linked} name="linked">
          <option value="">All staff links</option>
          <option value="linked">Linked</option>
          <option value="unlinked">Unlinked</option>
        </select>
        <button className="text-sm font-medium text-primary underline-offset-4 hover:underline" type="submit">
          Filter
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Account</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Workforce profile</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((member) => {
                const user = member.user as {
                  email?: unknown
                  displayName?: unknown
                } | null
                const staff = member.staff as {
                  firstName?: unknown
                  lastName?: unknown
                  staffNumber?: unknown
                } | null
                return (
                  <tr className="border-b border-border align-top" key={member.id}>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{String(user?.displayName ?? user?.email ?? "Account")}</div>
                      <div className="text-muted-foreground">{String(user?.email ?? "")}</div>
                    </td>
                    <td className="py-3 pr-3">
                      {canEdit ? (
                        <form action={changeMembershipRoleFormAction} className="flex items-center gap-2">
                          <input name="membershipId" type="hidden" value={member.id} />
                          <select
                            className={`${selectClassName} w-auto`}
                            defaultValue={member.roleId}
                            name="roleId"
                          >
                            {roles
                              .filter((role) => role.isActive !== false)
                              .map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                          </select>
                          <button className="text-xs font-medium underline-offset-4 hover:underline" type="submit">
                            Change
                          </button>
                        </form>
                      ) : (
                        String(member.role?.name ?? "")
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {membershipStatusLabels[member.status as keyof typeof membershipStatusLabels] ??
                        String(member.status)}
                    </td>
                    <td className="py-3 pr-3">
                      {staff ? (
                        <div>
                          <div>
                            {String(staff.firstName)} {String(staff.lastName)}
                          </div>
                          <div className="text-muted-foreground">Staff No. {String(staff.staffNumber)}</div>
                          {canLink ? (
                            <form action={unlinkMembershipStaffAction}>
                              <input name="membershipId" type="hidden" value={member.id} />
                              <ConfirmSubmit
                                className="text-xs font-medium underline-offset-4 hover:underline"
                                message="Unlink this workforce profile? The account and staff record will both remain."
                              >
                                Unlink
                              </ConfirmSubmit>
                            </form>
                          ) : null}
                        </div>
                      ) : canLink && member.status === "ACTIVE" ? (
                        <form action={linkMembershipStaffFormAction} className="flex items-center gap-2">
                          <input name="membershipId" type="hidden" value={member.id} />
                          <select className={`${selectClassName} w-auto`} name="staffId" required>
                            <option value="">Link staff…</option>
                            {unlinkedStaff.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {String(profile.firstName)} {String(profile.lastName)} ({String(profile.staffNumber)})
                              </option>
                            ))}
                          </select>
                          <button className="text-xs font-medium underline-offset-4 hover:underline" type="submit">
                            Link
                          </button>
                        </form>
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </td>
                    <td className="py-3">
                      {canDeactivate && member.status === "ACTIVE" && member.id !== membership.id ? (
                        <form action={deactivateMembershipAction}>
                          <input name="membershipId" type="hidden" value={member.id} />
                          <ConfirmSubmit
                            className="text-xs font-medium text-destructive underline-offset-4 hover:underline"
                            message="Deactivate this membership? The user will lose access to this organization."
                          >
                            Deactivate
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                      {canDeactivate && member.status === "SUSPENDED" ? (
                        <form action={reactivateMembershipAction}>
                          <input name="membershipId" type="hidden" value={member.id} />
                          <button className="text-xs font-medium underline-offset-4 hover:underline" type="submit">
                            Reactivate
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {result.pageCount > 1 ? (
        <p className="text-sm text-muted-foreground">
          Page {result.page} of {result.pageCount}.{" "}
          {result.page > 1 ? (
            <Link
              className="underline-offset-4 hover:underline"
              href={`/settings/users?page=${result.page - 1}`}
            >
              Previous
            </Link>
          ) : null}{" "}
          {result.page < result.pageCount ? (
            <Link
              className="underline-offset-4 hover:underline"
              href={`/settings/users?page=${result.page + 1}`}
            >
              Next
            </Link>
          ) : null}
        </p>
      ) : null}
    </main>
  )
}
