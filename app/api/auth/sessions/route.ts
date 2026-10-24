import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { SessionTracker } from '@/lib/auth/SessionTracker'
import { sha256 } from '@/lib/auth/hash'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: sessions } = await adminClient
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_active_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ sessions: sessions || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, data: authData } = await supabase.auth.getUser()
    const { data: sessionData } = await supabase.auth.getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const scope = searchParams.get('scope') // 'all_others' | 'single'

    if (scope === 'all_others' && sessionData.session?.access_token) {
      const currentHash = sha256(sessionData.session.access_token)
      await SessionTracker.revokeAllExceptCurrent(user.id, currentHash)
      return NextResponse.json({ success: true, message: 'All other sessions revoked' })
    }

    if (sessionId) {
      await SessionTracker.revokeSession(user.id, sessionId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Missing scope or session_id' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}