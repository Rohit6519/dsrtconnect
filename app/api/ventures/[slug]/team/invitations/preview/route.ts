import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
      .select('id')
      .eq('slug', slug)
      .single()

    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })

    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { invited_user_id, position_id } = body

    if (!invited_user_id) {
      return NextResponse.json({ error: 'invited_user_id is required' }, { status: 400 })
    }

    // Direct Database Eligibility Check
    const failures: string[] = []
    const warnings: string[] = []

    // 1. User check
    const { data: targetUser } = await supabase.from('users').select('id, status').eq('id', invited_user_id).maybeSingle()
    if (!targetUser) failures.push('User does not exist')

    // 2. Conflict Check
    const { data: membership } = await supabase
      .from('venture_team_memberships')
      .select('id')
      .eq('venture_id', venture.id)
      .eq('user_id', invited_user_id)
      .in('status', ['active', 'suspended'])
      .maybeSingle()
    
    if (membership) failures.push('User is already an active member of this venture.')

    // 3. Position Check
    if (position_id) {
      const { data: pos } = await supabase.from('venture_team_positions').select('capacity, occupied_count').eq('id', position_id).maybeSingle()
      if (!pos) failures.push('Target position does not exist.')
      else if ((pos.occupied_count || 0) >= (pos.capacity || 1)) failures.push('Position is at full capacity.')
    }

    // 4. Pending Invite Check
    const { data: activeInvite } = await supabase
      .from('venture_team_invitations')
      .select('id')
      .eq('venture_id', venture.id)
      .eq('invited_user_id', invited_user_id)
      .in('status', ['draft', 'sent', 'viewed', 'held'])
      .maybeSingle()
    
    if (activeInvite) warnings.push('User already has a pending invitation for this venture.')

    return NextResponse.json({ 
      eligibility: {
        eligible: failures.length === 0,
        hard_failures: failures,
        warnings: warnings,
        evaluated_at: new Date().toISOString()
      } 
    })
  } catch (e: any) {
    console.error('Eligibility preview error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to check eligibility' }, { status: 500 })
  }
}