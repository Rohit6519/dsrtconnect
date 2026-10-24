import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getOrigin(request: Request) {
  const url = new URL(request.url)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
  return url.origin
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const origin = getOrigin(request)

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  try {
    const supabase = createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[OAuth] Exchange error:', exchangeError.message)
      return NextResponse.redirect(`${origin}/login?error=auth_exchange_failed`)
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(`${origin}/login?error=no_user`)
    }

    // Fetch user identity state via Admin Client
    let { data: profile } = await adminClient
      .from('users')
      .select('id, normalized_username, onboarding_complete, account_status')
      .eq('id', user.id)
      .maybeSingle()

    // Fallback provision if database trigger was delayed or missing
    if (!profile) {
      const email = user.email || ''
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split('@')[0] ||
        'Builder'

      const avatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null

      const provider = user.app_metadata?.provider || 'oauth'
      const tempUsername = 'pending_' + user.id.replace(/-/g, '').slice(0, 10)

      const { data: createdProfile } = await adminClient
        .from('users')
        .upsert(
          {
            id: user.id,
            email,
            full_name: fullName,
            username: tempUsername,
            normalized_username: tempUsername,
            avatar_url: avatarUrl,
            account_state: 'USERNAME_REQUIRED',
            account_status: 'ACTIVE',
            email_verification_status: 'NOT_REQUESTED',
            trust_level: 'NEW',
            trust_score: 10,
            onboarding_complete: false,
            signup_source: provider,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select('id, normalized_username, onboarding_complete, account_status')
        .single()

      profile = createdProfile
    }

    if (profile?.account_status === 'SUSPENDED' || profile?.account_status === 'LOCKED') {
      return NextResponse.redirect(`${origin}/account-locked`)
    }

    const hasRealUsername = !!(
      profile?.normalized_username &&
      !profile.normalized_username.startsWith('pending_')
    )
    const isOnboarded = !!profile?.onboarding_complete

    // Adaptive Routing State Machine
    if (!hasRealUsername) {
      return NextResponse.redirect(`${origin}/auth/username`)
    }

    if (!isOnboarded) {
      return NextResponse.redirect(`${origin}/onboarding`)
    }

    const safeNext =
      next && next.startsWith('/') && !next.startsWith('//') ? next : '/home'

    return NextResponse.redirect(`${origin}${safeNext}`)
  } catch (e: any) {
    console.error('[OAuth] Callback fatal error:', e)
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }
}