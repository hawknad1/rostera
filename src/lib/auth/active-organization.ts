import { cookies } from "next/headers"

export const ACTIVE_ORGANIZATION_COOKIE = "rostera_active_organization"

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  }
}

export async function readActiveOrganizationCookie() {
  try {
    const store = await cookies()
    const value = store.get(ACTIVE_ORGANIZATION_COOKIE)?.value?.trim()
    return value && value.length > 0 ? value : null
  } catch {
    return null
  }
}

export async function writeActiveOrganizationCookie(organizationId: string) {
  try {
    const store = await cookies()
    store.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, cookieOptions())
  } catch {
    // Server Components cannot always write cookies.
  }
}

export async function clearActiveOrganizationCookie() {
  try {
    const store = await cookies()
    store.delete(ACTIVE_ORGANIZATION_COOKIE)
  } catch {
    // Server Components cannot always write cookies.
  }
}
