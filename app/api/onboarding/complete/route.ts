import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { TrustEngine } from '@/lib/trust/TrustEngine'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: result, error } = await adminClient.rpc('complete_onboarding_v2', {
      p_user_id: user.id,
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to complete onboarding', details: error.message }, { status: 500 })
    }

    // Fire trust recomputation (non-blocking)
    TrustEngine.recomputeScore(user.id).catch(() => {})

    return NextResponse.json({
      success: true,
      redirect: '/home',
      ...result,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}