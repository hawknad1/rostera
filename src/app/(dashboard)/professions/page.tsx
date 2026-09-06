import { hasPermission } from "@/lib/auth/has-permission"
import { requirePermission } from "@/lib/auth/require-permission"
import { professionAuthorization } from "@/modules/professions/authorization"
import { listProfessions } from "@/modules/professions/services/professions"
import { CreateProfessionForm } from "@/modules/professions/ui/create-profession-form"
import { OrganizationProfessionList } from "@/modules/professions/ui/organization-profession-list"

export default async function ProfessionsPage() {
  const membership = await requirePermission(professionAuthorization.view)
  const [{ global, organization }, canCreate, canEdit] = await Promise.all([
    listProfessions(),
    hasPermission(membership, professionAuthorization.create),
    hasPermission(membership, professionAuthorization.edit),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Professions</h1>
        <p className="text-sm text-muted-foreground">
          Global catalog roles are read-only. You can add professions specific to this hospital.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Global professions</h2>
          <p className="text-sm text-muted-foreground">Shared catalog. Hospital users cannot change these.</p>
        </div>
        {global.length === 0 ? (
          <p className="text-sm text-muted-foreground">No global professions are available yet.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {global.map((profession) => (
              <li className="flex flex-wrap items-baseline justify-between gap-2 py-3" key={profession.id}>
                <div>
                  <p className="font-medium">{profession.name}</p>
                  {profession.description ? (
                    <p className="text-sm text-muted-foreground">{profession.description}</p>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">Global · read-only</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Hospital professions</h2>
          <p className="text-sm text-muted-foreground">
            Professions that belong only to this organization.
          </p>
        </div>
        <OrganizationProfessionList canEdit={canEdit} professions={organization} />
        {canCreate ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-medium">Create hospital profession</h3>
            <CreateProfessionForm />
          </div>
        ) : null}
      </section>
    </main>
  )
}
