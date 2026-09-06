import { hasPermission } from "@/lib/auth/has-permission"
import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { permissions } from "@/lib/permissions/permissions"
import { reportError } from "@/modules/reports/errors"

export async function requireReportView() {
  const membership = await getCurrentMembership()

  if (!membership) {
    throw reportError("UNAUTHENTICATED")
  }

  const allowed = await hasPermission(membership, permissions.reportsView)

  if (!allowed) {
    throw reportError("REPORT_UNAUTHORIZED")
  }

  return membership
}

export async function requireReportExport() {
  const membership = await requireReportView()
  const allowed = await hasPermission(membership, permissions.reportsExport)

  if (!allowed) {
    throw reportError("EXPORT_NOT_ALLOWED")
  }

  return membership
}

export async function reportExportAllowed(
  membership: Awaited<ReturnType<typeof requireReportView>>,
) {
  return hasPermission(membership, permissions.reportsExport)
}
