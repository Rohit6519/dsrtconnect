import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { opportunity_id } = body

    // Verify opportunity belongs to same venture (if linking)
    if (opportunity_id) {
      const { data: opp } = await supabase
        .from('opportunities')
        .select('id, venture_id')
        .eq('id', opportunity_id)
        .single()

      if (!opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
      if (opp.venture_id !== venture.id) {
        return NextResponse.json({ error: 'Opportunity does not belong to this venture' }, { status: 403 })
      }
    }

    // Update position
    const { data: position, error } = await supabase
      .from('venture_team_positions')
      .update({
        linked_opportunity_id: opportunity_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('venture_id', venture.id)
      .select()
      .single()

    if (error) throw error

    // Log activity
    try {
      await supabase.from('venture_team_activity').insert({
        venture_id: venture.id,
        actor_id: user.id,
        action: opportunity_id ? 'position.linked_opportunity' : 'position.unlinked_opportunity',
        target_type: 'position',
        target_id: id,
        metadata: { opportunity_id }
      })
    } catch {}

    // Sync opportunity positions_open with new position capacity
    if (opportunity_id) {
      const remaining = Math.max(0, (position.capacity || 1) - (position.occupied_count || 0))
      await supabase
        .from('opportunities')
        .update({ positions_open: remaining, updated_at: new Date().toISOString() })
        .eq('id', opportunity_id)
    }

    return NextResponse.json({ success: true, position })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}