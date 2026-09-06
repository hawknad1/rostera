import Link from "next/link"
import { notFound } from "next/navigation"

import { requirePermission } from "@/lib/auth/require-permission"
import { permissions } from "@/lib/permissions/permissions"
import { isAuditError } from "@/modules/audit/errors"
import { getAuditEvent } from "@/modules/audit/services/audit"
import { AuditDetail } from "@/modules/audit/ui/audit-detail"

export default async function AuditEventPage({
  params,
}: PageProps<"/audit/[id]">) {
  const membership = await requirePermission(permissions.auditView)
  const { id } = await params

  let event
  try {
    event = await getAuditEvent(id)
  } catch (error) {
    if (isAuditError(error) && error.code === "AUDIT_NOT_FOUND") {
      notFound()
    }

    throw error
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <Link
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        href="/audit"
      >
        Back to audit trail
      </Link>
      <AuditDetail
        event={event}
        organizationName={String(membership.organization.name)}
        timeZone={String(membership.organization.timezone)}
      />
    </main>
  )
}
