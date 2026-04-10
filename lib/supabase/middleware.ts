import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { type Database } from "@/types/database"

export async function updateSession(request: NextRequest) {
  // Pass pathname to server components via request header
  request.headers.set("x-next-pathname", request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({
    request,
  })

  // If Supabase is not configured, redirect to login (avoids crash)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/register")) {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to
  // debug issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/register") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/api/webhooks") &&
    !request.nextUrl.pathname.startsWith("/partner/") &&
    !request.nextUrl.pathname.startsWith("/impressum") &&
    !request.nextUrl.pathname.startsWith("/datenschutz") &&
    !request.nextUrl.pathname.startsWith("/agb") &&
    request.nextUrl.pathname !== "/"
  ) {
    // No user and trying to access a protected route - redirect to login
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You must return the supabaseResponse object as-is.
  // If you create a new response with NextResponse.next(), make sure to:
  // 1. Pass the request: NextResponse.next({ request })
  // 2. Copy over the cookies: supabaseResponse.cookies -> new response cookies
  // Otherwise the browser and server sessions will go out of sync.

  return supabaseResponse
}
