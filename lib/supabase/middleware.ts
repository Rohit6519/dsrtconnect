import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

interface CookieToSet {
  name: string
  value: string
  options?: CookieOptions
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // MUST run immediately after createServerClient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 1. Always allow auth callbacks, static assets, and password resets
  const bypassRoutes = [
    '/callback',
    '/auth/callback',
    '/reset-password',
    '/forgot-password',
    '/api',
    '/_next',
    '/favicon.ico',
  ]

  if (bypassRoutes.some((route) => pathname.startsWith(route))) {
    return supabaseResponse
  }

  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  const isPublicRoot = pathname === '/'

  // 2. Unauthenticated user trying to access app pages -> redirect to login
  if (!user && !isAuthRoute && !isPublicRoot) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    
    // Copy cookies to redirect response so session state is preserved
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // 3. Authenticated user trying to access /login or /signup -> redirect to /home
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    const redirectResponse = NextResponse.redirect(url)
    
    // Copy cookies to redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return supabaseResponse
}