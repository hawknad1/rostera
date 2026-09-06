import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import {
  isAuthRoute,
  isSessionExemptPath,
  shouldBypassSessionRefresh,
} from "@/lib/auth/request-access"
import { safeInternalPath } from "@/lib/http/safe-path"

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (shouldBypassSessionRefresh(pathname)) {
    return NextResponse.next({
      request,
    })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  /*
   * Do not use getSession() here.
   *
   * getClaims() verifies the JWT and is the current
   * Supabase-recommended method for protecting server-side routes.
   */
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims && !isAuthRoute(pathname) && !isSessionExemptPath(pathname)) {
    const url = request.nextUrl.clone()
    const next = safeInternalPath(`${pathname}${request.nextUrl.search}`) ?? "/"

    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("next", next)

    return NextResponse.redirect(url)
  }

  if (claims && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone()

    url.pathname = "/dashboard"

    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
