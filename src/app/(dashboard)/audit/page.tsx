import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { AuditFilters } from "@/modules/audit/ui/audit-filters"
import { AuditTable } from "@/modules/audit/ui/audit-table"
import { listAuditActors, listAuditEvents } from "@/modules/audit/services/audit"
import { auditListFilterSchema } from "@/modules/audit/schemas/audit"

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const membership = await requirePermission(permissions.auditView)
  const params = await searchParams
  const parsed = auditListFilterSchema.safeParse({
    page: typeof params.page === "string" ? params.page : undefined,
    action: typeof params.action === "string" ? params.action : undefined,
    entityType: typeof params.entityType === "string" ? params.entityType : undefined,
    actorUserId: typeof params.actor === "string" ? params.actor : undefined,
    q: typeof params.q === "string" ? params.q : undefined,
    from: typeof params.from === "string" ? params.from : undefined,
    to: typeof params.to === "string" ? params.to : undefined,
  })
  const filters = parsed.success ? parsed.data : {}
  const [result, actors] = await Promise.all([
    listAuditEvents(filters),
    listAuditActors(),
  ])

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Track important changes and actions across your organization.
        </p>
      </div>
      <AuditFilters actors={actors} filters={filters} />
      <AuditTable
        events={result.items}
        filters={filters}
        hasNext={result.hasNext}
        hasPrevious={result.hasPrevious}
        page={result.page}
        timeZone={String(membership.organization.timezone)}
        total={result.total}
      />
    </main>
  )
}
