import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth")

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")

  if (!claims && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()

    url.pathname = "/login"
    url.searchParams.set("redirectTo", pathname)

    return NextResponse.redirect(url)
  }

  if (claims && isAuthRoute) {
    const url = request.nextUrl.clone()

    url.pathname = "/dashboard"

    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
