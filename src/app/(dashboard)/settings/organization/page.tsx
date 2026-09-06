import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import {
  suspendOrganizationAction,
} from "@/modules/organizations/actions/organization"
import { organizationStatusLabels, organizationTypeLabels } from "@/modules/organizations/labels"
import { OrganizationSettingsForm } from "@/modules/organizations/ui/organization-settings-form"
import { ConfirmSubmit } from "@/modules/organizations/ui/confirm-submit"
import { db } from "@/prisma/db"

export default async function OrganizationSettingsPage() {
  const membership = await requirePermission(permissions.organizationView)
  const organization = await db.orm.public.Organization.where({
    id: membership.organizationId,
  }).first()

  if (!organization) {
    return null
  }

  const [canEdit, canSuspend] = await Promise.all([
    hasPermission(membership, permissions.organizationEdit),
    hasPermission(membership, permissions.organizationSuspend),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground">
          {organizationTypeLabels[organization.organizationType as keyof typeof organizationTypeLabels] ??
            organization.organizationType}{" "}
          · {organizationStatusLabels[organization.status as keyof typeof organizationStatusLabels]}
        </p>
      </div>

      <OrganizationSettingsForm
        canEdit={canEdit}
        values={{
          name: String(organization.name),
          organizationType: String(organization.organizationType ?? "HOSPITAL"),
          phone: organization.phone ? String(organization.phone) : "",
          email: organization.email ? String(organization.email) : "",
          address: organization.address ? String(organization.address) : "",
          city: organization.city ? String(organization.city) : "",
          region: organization.region ? String(organization.region) : "",
          country: String(organization.country),
          timezone: String(organization.timezone),
        }}
      />

      {canSuspend ? (
        <section className="flex max-w-xl flex-col gap-3 border-t border-border pt-8">
          <h2 className="text-lg font-medium">Organization status</h2>
          <p className="text-sm text-muted-foreground">
            Suspension blocks operational access and preserves all records. It does not delete data.
          </p>
          <p className="text-sm">
            Status: {organizationStatusLabels[organization.status as keyof typeof organizationStatusLabels]}
          </p>
          {organization.status === "ACTIVE" ? (
            <form action={suspendOrganizationAction}>
              <ConfirmSubmit
                className="text-sm font-medium text-destructive underline-offset-4 hover:underline"
                message="Suspend this organization? Users will lose operational access until it is reactivated."
              >
                Suspend organization
              </ConfirmSubmit>
            </form>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}
