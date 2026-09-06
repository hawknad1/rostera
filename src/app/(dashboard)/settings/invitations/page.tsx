import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import {
  resendInvitationAction,
  revokeInvitationAction,
} from "@/modules/organizations/actions/invitations"
import { invitationStatusLabels } from "@/modules/organizations/labels"
import { listInvitations } from "@/modules/organizations/services/invitations"
import { listOrganizationRoles } from "@/modules/organizations/services/memberships"
import { ConfirmSubmit } from "@/modules/organizations/ui/confirm-submit"
import { InviteUserForm } from "@/modules/organizations/ui/invite-user-form"

export default async function InvitationsPage() {
  const membership = await requirePermission(permissions.usersView)
  const [result, roles, canInvite] = await Promise.all([
    listInvitations({ status: "PENDING" }),
    listOrganizationRoles(),
    hasPermission(membership, permissions.usersInvite),
  ])
  const assignableRoles = roles.filter((role) => role.isActive !== false)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Invitations</h1>
        <p className="text-sm text-muted-foreground">
          Invite people to this organization. Membership is created only after the invitation is accepted.
        </p>
      </div>

      {canInvite ? <InviteUserForm roles={assignableRoles.map((role) => ({ id: role.id, name: role.name }))} /> : null}

      {result.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending invitations.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Expires</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((invitation) => (
                <tr className="border-b border-border" key={invitation.id}>
                  <td className="py-3 pr-3">{String(invitation.email)}</td>
                  <td className="py-3 pr-3">{String(invitation.role?.name ?? "")}</td>
                  <td className="py-3 pr-3">{String(invitation.expiresAt).slice(0, 16)}</td>
                  <td className="py-3 pr-3">
                    {invitationStatusLabels[invitation.status as keyof typeof invitationStatusLabels]}
                  </td>
                  <td className="py-3">
                    {canInvite && invitation.status === "PENDING" ? (
                      <div className="flex flex-wrap gap-3">
                        <form action={resendInvitationAction}>
                          <input name="invitationId" type="hidden" value={invitation.id} />
                          <button className="text-xs font-medium underline-offset-4 hover:underline" type="submit">
                            Resend
                          </button>
                        </form>
                        <form action={revokeInvitationAction}>
                          <input name="invitationId" type="hidden" value={invitation.id} />
                          <ConfirmSubmit
                            className="text-xs font-medium text-destructive underline-offset-4 hover:underline"
                            message="Revoke this invitation? It cannot be used again."
                          >
                            Revoke
                          </ConfirmSubmit>
                        </form>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
