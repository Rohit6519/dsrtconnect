// filepath: middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

interface CookieToSet {
  name: string
  value: string
  options?: CookieOptions
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Bypass API, callback, static assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/callback') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return supabaseResponse
  }

  const publicAuthRoutes = ['/login', '/signup', '/reset-password', '/forgot-password']
  const isPublicAuth = publicAuthRoutes.some((p) => pathname.startsWith(p))
  const isPublicRoot = pathname === '/'

  // Unauthenticated user
  if (!user) {
    if (!isPublicAuth && !isPublicRoot) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Authenticated: fetch state machine
  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_state, onboarding_complete, account_status, normalized_username')
    .eq('id', user.id)
    .maybeSingle()

  const state = profile?.onboarding_state || 'USERNAME_REQUIRED'
  const isOnboarded = !!profile?.onboarding_complete
  const status = profile?.account_status || 'ACTIVE'

  // Suspended / locked
  if (status === 'SUSPENDED' || status === 'LOCKED') {
    if (pathname !== '/account-locked') {
      return NextResponse.redirect(new URL('/account-locked', request.url))
    }
    return supabaseResponse
  }

  const hasRealUsername = !!(profile?.normalized_username && !profile.normalized_username.startsWith('pending_'))

  // ADAPTIVE FLOW
  if (!hasRealUsername && !pathname.startsWith('/auth/username')) {
    return NextResponse.redirect(new URL('/auth/username', request.url))
  }

  if (hasRealUsername && !isOnboarded && !pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Completed users → block auth & onboarding AND block root `/`
  if (hasRealUsername && isOnboarded) {
    if (isPublicAuth || isPublicRoot || pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}