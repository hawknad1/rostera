import { requireOrganization } from "@/lib/auth/require-organization"
import { getCurrentUser } from "@/lib/auth/get-current-user"
import { AccountForm } from "@/modules/organizations/ui/account-form"
import { db } from "@/prisma/db"

export default async function AccountSettingsPage() {
  const membership = await requireOrganization()
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const staff = await db.orm.public.StaffProfile.where({
    organizationId: membership.organizationId,
    userId: user.id,
  })
    .include("department")
    .include("profession")
    .first()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Application profile for this login. Workforce details belong to a staff record.
        </p>
      </div>

      <section className="flex flex-col gap-1 text-sm">
        <h2 className="text-lg font-medium">Account</h2>
        <p>{user.displayName ? String(user.displayName) : "No display name"}</p>
        <p className="text-muted-foreground">{user.email ? String(user.email) : "No email on file"}</p>
      </section>

      <AccountForm
        displayName={user.displayName ? String(user.displayName) : ""}
        phone={user.phone ? String(user.phone) : ""}
      />

      <section className="flex flex-col gap-1 text-sm">
        <h2 className="text-lg font-medium">Workforce profile</h2>
        {staff ? (
          <>
            <p>
              {String(staff.profession?.name ?? "Staff")} · {String(staff.department?.name ?? "Department")}
            </p>
            <p className="text-muted-foreground">Staff No. {String(staff.staffNumber)}</p>
          </>
        ) : (
          <p className="text-muted-foreground">No workforce profile is linked to this account in this organization.</p>
        )}
      </section>
    </main>
  )
}
