import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Verify venture ownership
  const { data: venture } = await supabase
    .from('ventures')
    .select('id, name, logo_url')
    .eq('slug', slug)
    .single()

  if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

  const isOwner = await supabase.rpc('is_venture_owner_or_member', {
    p_venture_id: venture.id,
    p_user_id: user.id
  })
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 2. Fetch the Team Position
  const { data: position } = await supabase
    .from('venture_team_positions')
    .select('*')
    .eq('id', id)
    .eq('venture_id', venture.id)
    .single()

  if (!position) return NextResponse.json({ error: 'Position not found' }, { status: 404 })

  try {
    // 3. Generate a Looking For Draft (OPP-XXXXXX)
    const oppNumber = 'OPP-' + Math.random().toString(36).slice(2, 8).toUpperCase()

    // We create the draft directly in `opportunities` with status = 'draft'
    // This matches the standard DSRT Looking For Studio architecture.
    const { data: opp, error: oppErr } = await supabase
      .from('opportunities')
      .insert({
        poster_user_id: user.id,
        poster_context: 'venture',
        venture_id: venture.id,
        linked_position_id: position.id,  // The architectural bridge
        opportunity_type: 'hire',
        title: position.title || 'Untitled Role',
        description: position.description || '',
        required_skills: position.required_skills || [],
        preferred_skills: position.preferred_skills || [],
        positions_open: Math.max(1, position.capacity - position.occupied_count),
        status: 'draft',
        visibility: 'public',
        applications_open: true,
        opportunity_number: oppNumber,
        cover_image_url: venture.logo_url // Default to venture branding
      })
      .select('id')
      .single()

    if (oppErr) throw oppErr

    // 4. Update the Position to reflect the new link
    const { error: posErr } = await supabase
      .from('venture_team_positions')
      .update({ 
        linked_opportunity_id: opp.id,
        status: 'recruiting', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)

    if (posErr) throw posErr

    // 5. Audit Event
    await supabase.rpc('fn_venture_audit', {
      p_venture_id: venture.id,
      p_action: 'position.opportunity_created',
      p_target_type: 'opportunity',
      p_target_id: opp.id,
      p_metadata: { position_id: position.id }
    })

    // 6. Return the Draft ID so the client can redirect to the Studio
    return NextResponse.json({ success: true, draft_id: opp.id })
  } catch (e: any) {
    console.error('Create linked opportunity error:', e)
    return NextResponse.json({ error: e.message || 'Failed to create opportunity' }, { status: 500 })
  }
}