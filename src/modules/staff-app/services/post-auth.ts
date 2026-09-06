import { getCurrentMembership } from "@/lib/auth/get-current-membership"
import { hasAdminSurfaceAccess } from "@/lib/auth/admin-surface"

export { hasAdminSurfaceAccess } from "@/lib/auth/admin-surface"

export async function resolvePostAuthHref() {
  const membership = await getCurrentMembership()

  if (!membership) {
    return "/onboarding"
  }

  if (await hasAdminSurfaceAccess(membership)) {
    return "/dashboard"
  }

  return "/me"
}
