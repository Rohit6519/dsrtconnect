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

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase
      .from('ventures')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })

    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') 

    let query = supabase
      .from('venture_team_invitations')
      .select(`
        *,
        invited_user:users!invited_user_id(id, full_name, username, avatar_url, tagline),
        invited_by:users!invited_by_user_id(id, full_name, username, avatar_url),
        position:venture_team_positions(id, title, team_name, department)
      `)
      .eq('venture_id', venture.id)
      .order('created_at', { ascending: false })

    if (status === 'pending') {
      query = query.in('status', ['sent', 'viewed', 'held'])
    } else if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: invitationsList, error } = await query
    if (error) throw error

    return NextResponse.json({ invitations: invitationsList || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

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
      .select('id, name, slug, logo_url')
      .eq('slug', slug)
      .single()

    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const {
      invited_user_id, position_id, role_id, proposed_role_title,
      permissions_snapshot = [], personal_message, expiration_days = 7,
      source = 'direct_invitation', application_id
    } = body

    if (!invited_user_id) {
      return NextResponse.json({ error: 'Invited user is required' }, { status: 400 })
    }

    // Direct Database Eligibility Check (Replacing missing Phase 2 Service)
    const { data: activeInvite } = await supabase
      .from('venture_team_invitations')
      .select('id')
      .eq('venture_id', venture.id)
      .eq('invited_user_id', invited_user_id)
      .in('status', ['draft', 'sent', 'viewed', 'held'])
      .maybeSingle()

    if (activeInvite) {
      return NextResponse.json({ error: 'User already has an active invitation' }, { status: 409 })
    }

    const idempotencyKey = req.headers.get('X-Idempotency-Key') || `inv-${venture.id}-${invited_user_id}-${Date.now()}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (parseInt(expiration_days) || 7))
    const secureToken = 'inv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12)

    let positionSnapshot = null
    if (position_id) {
      const { data: pos } = await supabase
        .from('venture_team_positions')
        .select('*')
        .eq('id', position_id)
        .eq('venture_id', venture.id)
        .single()
      positionSnapshot = pos
    }

    const { data: invitation, error: invErr } = await supabase
      .from('venture_team_invitations')
      .insert({
        venture_id: venture.id,
        invited_user_id,
        invited_by_user_id: user.id,
        position_id: position_id || null,
        role_id: role_id || null,
        proposed_role_title: proposed_role_title || (positionSnapshot?.title) || 'Team Member',
        proposed_role_snapshot: positionSnapshot,
        venture_snapshot: venture,
        permissions_snapshot,
        personal_message: personal_message?.trim() || null,
        expires_at: expiresAt.toISOString(),
        secure_token: secureToken,
        idempotency_key: idempotencyKey,
        eligibility_snapshot: { eligible: true, hard_failures: [], warnings: [] },
        status: 'sent',
        source,
        application_id: application_id || null
      })
      .select()
      .single()

    if (invErr) {
      if (invErr.code === '23505') {
        const { data: existing } = await supabase.from('venture_team_invitations').select('*').eq('idempotency_key', idempotencyKey).single()
        return NextResponse.json({ success: true, invitation: existing, duplicate: true })
      }
      throw invErr
    }

    // Log Activity
    try {
      await supabase.from('venture_team_activity').insert({
        venture_id: venture.id,
        actor_id: user.id,
        action: 'invitation.sent',
        target_type: 'invitation',
        target_id: invitation.id,
        new_state: invitation,
      })
    } catch {}

    return NextResponse.json({ success: true, invitation })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}