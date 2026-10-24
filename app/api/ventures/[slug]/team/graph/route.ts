import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: venture } = await supabase
    .from('ventures')
    .select('id, user_id, founder_id, name, show_in_explore, status')
    .eq('slug', slug)
    .maybeSingle()

  if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ownerId = venture.user_id || venture.founder_id

  const isOwnerOrMember = user && (
    venture.user_id === user.id || 
    venture.founder_id === user.id ||
    await supabase.from('venture_team_memberships')
      .select('id').eq('venture_id', venture.id).eq('user_id', user.id).eq('status', 'active').maybeSingle()
      .then(r => !!r.data)
  )

  if (!isOwnerOrMember && (!venture.show_in_explore || venture.status !== 'active')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    let [positionsRes, relationshipsRes, membershipsRes, layoutRes] = await Promise.all([
      supabase.from('venture_team_positions').select('*, linked_opportunity:opportunities(id, slug, title, status, positions_open)').eq('venture_id', venture.id).is('archived_at', null),
      supabase.from('venture_team_relationships').select('*').eq('venture_id', venture.id),
      // REMOVED tagline from select to prevent 500 errors if it doesn't exist
      supabase.from('venture_team_memberships').select('*, user:users(id, full_name, username, avatar_url)').eq('venture_id', venture.id).eq('status', 'active'),
      supabase.from('venture_team_graph_layout').select('*').eq('venture_id', venture.id).is('user_id', null)
    ])

    let positions = positionsRes.data || []
    let memberships = membershipsRes.data || []
    let layout = layoutRes.data || []

    if (positions.length === 0 && ownerId) {
      const { data: newPos } = await supabase.from('venture_team_positions').insert({
        venture_id: venture.id, title: 'Founder & CEO', position_type: 'founder', status: 'occupied', capacity: 1, occupied_count: 1
      }).select().single()

      if (newPos) {
        const { data: newMem } = await supabase.from('venture_team_memberships').insert({
          venture_id: venture.id, user_id: ownerId, position_id: newPos.id, role_title: 'Founder & CEO', source: 'admin', status: 'active', activated_at: new Date().toISOString()
        }).select('*, user:users(id, full_name, username, avatar_url)').single()

        const { data: newLayout } = await supabase.from('venture_team_graph_layout').insert({
          venture_id: venture.id, position_id: newPos.id, x: 0, y: 0
        }).select().single()

        if (newPos) positions = [newPos]
        if (newMem) memberships = [newMem]
        if (newLayout) layout = [newLayout]
      }
    }

    return NextResponse.json({
      positions,
      relationships: relationshipsRes.data || [],
      memberships,
      layout,
      canEdit: isOwnerOrMember
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: e.message }, { status: 500 })
  }
}