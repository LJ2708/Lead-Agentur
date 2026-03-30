import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Marketing domain: leadsolution.de (NOT localhost — localhost uses default behavior)
  const isMarketingDomain =
    hostname === 'leadsolution.de' ||
    hostname === 'www.leadsolution.de'

  // Hub domain: hub.leadsolution.de
  const isHubDomain =
    hostname === 'hub.leadsolution.de'

  if (isMarketingDomain) {
    // Marketing pages: /, /impressum, /datenschutz, /agb
    const marketingPaths = ['/', '/impressum', '/datenschutz', '/agb']
    if (marketingPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.next()
    }
    // Everything else on marketing domain -> redirect to hub
    return NextResponse.redirect(`https://hub.leadsolution.de${pathname}`)
  }

  if (isHubDomain) {
    // Hub domain: run Supabase session middleware
    return await updateSession(request)
  }

  // Default (Vercel preview URL, other domains): run Supabase session middleware
  // This keeps existing behavior working on a single domain
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhooks/* (webhook endpoints)
     * - api/cron/* (cron endpoints)
     * - api/seed* (seed endpoints)
     * - api/pricing/* (public pricing endpoints)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/webhooks/.*|api/cron/.*|api/seed.*|api/pricing/.*|api/import/.*).*)",
  ],
}
