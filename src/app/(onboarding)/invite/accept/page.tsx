import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/get-auth-user"
import { AcceptInvitationForm } from "@/modules/organizations/ui/accept-invitation-form"
import { previewInvitation } from "@/modules/organizations/services/invitations"

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : ""

  if (!token) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Invitation</h1>
        <p className="text-sm text-muted-foreground">This invitation link is missing a token.</p>
      </main>
    )
  }

  const invitation = await previewInvitation(token)
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect(`/login?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`)
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Accept invitation</h1>
        {invitation ? (
          <p className="text-sm text-muted-foreground">
            You were invited to join {String(invitation.organization?.name ?? "an organization")} as{" "}
            {String(invitation.role?.name ?? "a member")}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">This invitation is not valid.</p>
        )}
      </div>
      {invitation ? <AcceptInvitationForm token={token} /> : null}
    </main>
  )
}
