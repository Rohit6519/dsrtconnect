import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invitation_type, invitation_id, action } = await request.json()
  // invitation_type: 'organization' | 'community' | 'project' | 'connection'
  // action: 'accept' | 'decline'

  if (!invitation_type || !invitation_id || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Missing/invalid fields' }, { status: 400 })
  }

  if (invitation_type === 'organization') {
    const { data: invite } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('id', invitation_id)
      .single()
    if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await supabase.from('organization_invitations').update({
      status: action === 'accept' ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
      invited_user_id: user.id,
    }).eq('id', invitation_id)

    if (action === 'accept') {
      await supabase.from('organization_members').insert({
        organization_id: invite.organization_id,
        user_id: user.id,
        role: invite.role || 'member',
        status: 'active',
        verified: true,
        verified_at: new Date().toISOString(),
        verification_method: 'invitation',
      }).select()
    }
  } else if (invitation_type === 'community') {
    const { data: invite } = await supabase
      .from('community_invitations')
      .select('*')
      .eq('id', invitation_id)
      .single()
    if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await supabase.from('community_invitations').update({
      status: action === 'accept' ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
      invited_user_id: user.id,
    }).eq('id', invitation_id)

    if (action === 'accept') {
      await supabase.from('community_members').insert({
        community_id: invite.community_id,
        user_id: user.id,
        role: invite.role || 'member',
      })
    }
  } else if (invitation_type === 'project') {
    const { data: invite } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('id', invitation_id)
      .single()
    if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await supabase.from('project_invitations').update({
      status: action === 'accept' ? 'accepted' : 'declined',
      accepted_at: action === 'accept' ? new Date().toISOString() : null,
      invited_user_id: user.id,
    }).eq('id', invitation_id)

    if (action === 'accept') {
      await supabase.from('project_members').insert({
        project_id: invite.project_id,
        user_id: user.id,
        role: invite.role || 'member',
      })
    }
  } else if (invitation_type === 'connection') {
    await supabase.from('builder_connections').update({
      status: action === 'accept' ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    }).eq('id', invitation_id).eq('recipient_id', user.id)

    if (action === 'accept') {
      // Create mutual follow
      const { data: conn } = await supabase.from('builder_connections').select('requester_id').eq('id', invitation_id).single()
      if (conn) {
        await Promise.all([
          supabase.from('follows').insert({ follower_id: user.id, following_type: 'user', following_id: conn.requester_id }),
          supabase.from('follows').insert({ follower_id: conn.requester_id, following_type: 'user', following_id: user.id }),
        ])
      }
    }
  }

  return NextResponse.json({ success: true })
}