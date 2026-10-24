import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/ventures/[slug]/open-roles/create
 * Body: { position_id?: string, title?: string }
 * Creates a canonical Looking For draft with venture context pre-filled.
 * Returns the draft_id for redirecting to the Studio.
 */
export async function POST(
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
      .select('id, name, logo_url, industry')
      .eq('slug', slug)
      .single()

    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })

    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const positionId = body.position_id || null
    let title = body.title || 'Untitled Role'
    let requiredSkills: string[] = []
    let preferredSkills: string[] = []
    let positionsOpen = 1

    // If linking to a team position, pre-fill from position data
    if (positionId) {
      const { data: position } = await supabase
        .from('venture_team_positions')
        .select('title, description, required_skills, preferred_skills, capacity, occupied_count')
        .eq('id', positionId)
        .eq('venture_id', venture.id)
        .maybeSingle()

      if (position) {
        title = position.title || title
        requiredSkills = position.required_skills || []
        preferredSkills = position.preferred_skills || []
        positionsOpen = Math.max(1, (position.capacity || 1) - (position.occupied_count || 0))
      }
    }

    // Generate opportunity number
    const oppNumber = 'OPP-' + Math.random().toString(36).slice(2, 8).toUpperCase()

    // Create canonical opportunity draft
    const { data: opp, error: oppErr } = await supabase
      .from('opportunities')
      .insert({
        poster_user_id: user.id,
        poster_context: 'venture',
        venture_id: venture.id,
        linked_position_id: positionId,
        opportunity_type: 'hire',
        title,
        description: '',
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        positions_open: positionsOpen,
        status: 'draft',
        visibility: 'public',
        applications_open: true,
        opportunity_number: oppNumber,
        cover_image_url: venture.logo_url,
      })
      .select('id, opportunity_number')
      .single()

    if (oppErr) throw oppErr

    // Update the team position to link to this opportunity
    if (positionId) {
      await supabase
        .from('venture_team_positions')
        .update({
          linked_opportunity_id: opp.id,
          status: 'recruiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', positionId)
        .eq('venture_id', venture.id)
    }

    // Audit
    try {
      await supabase.rpc('fn_venture_audit', {
        p_venture_id: venture.id,
        p_action: 'open_role.created',
        p_target_type: 'opportunity',
        p_target_id: opp.id,
        p_metadata: { position_id: positionId, title }
      })
    } catch {}

    return NextResponse.json({
      success: true,
      draft_id: opp.id,
      opportunity_number: opp.opportunity_number,
      studio_url: `/looking-for/create-v2/${opp.id}`,
    })
  } catch (e: any) {
    console.error('Create open role error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}