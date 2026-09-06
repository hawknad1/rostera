import { hasAdminSurfaceAccess } from "@/lib/auth/admin-surface"
import { resolveMembership } from "@/lib/auth/get-current-membership"

export { hasAdminSurfaceAccess } from "@/lib/auth/admin-surface"

export async function resolvePostAuthHref() {
  const resolved = await resolveMembership()

  if (resolved.status === "no_membership") {
    return "/onboarding"
  }

  if (resolved.status === "needs_selection") {
    return "/select-organization"
  }

  if (resolved.status === "suspended") {
    return "/organization-suspended"
  }

  if (resolved.status !== "ready") {
    return "/login"
  }

  if (await hasAdminSurfaceAccess(resolved.membership)) {
    return "/dashboard"
  }

  return "/me"
}
