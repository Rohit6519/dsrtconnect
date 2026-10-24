import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase
      .from('ventures')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    // Verify user is active member
    const { data: membership } = await supabase
      .from('venture_team_memberships')
      .select('id, onboarding_completed_at')
      .eq('venture_id', venture.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    const body = await req.json()
    const { current_step, complete } = body

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (typeof current_step === 'number') {
      patch.onboarding_current_step = Math.max(0, Math.min(10, current_step))
    }

    if (complete && !membership.onboarding_completed_at) {
      patch.onboarding_completed_at = new Date().toISOString()

      // Log completion activity
      try {
        await supabase.from('venture_team_activity').insert({
          venture_id: venture.id,
          actor_id: user.id,
          action: 'onboarding.completed',
          target_type: 'membership',
          target_id: membership.id
        })
      } catch {}
    }

    const { data, error } = await supabase
      .from('venture_team_memberships')
      .update(patch)
      .eq('id', membership.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, membership: data })
  } catch (e: any) {
    console.error('Onboarding update error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to update onboarding' }, { status: 500 })
  }
}