import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: token } = await context.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Invalid invitation link' }, { status: 400 })
  }

  try {
    const { data: hashedToken, error: hashErr } = await supabase.rpc('hash_team_invitation_token', {
      p_token: token
    })

    if (hashErr || !hashedToken) {
      throw new Error('Internal crypto error')
    }

    const { data: invite, error: fetchErr } = await supabase
      .from('project_team_invitations')
      .select(`
        id, state, expires_at, snapshot, personal_message,
        invited_user_id, invited_email, invited_name,
        created_at, view_count,
        project:projects!inner(id, name, slug, logo_url, cover_image_url),
        inviter:users!project_team_invitations_inviter_id_fkey(id, full_name, avatar_url, tagline)
      `)
      .eq('token_hash', hashedToken)
      .maybeSingle()

    if (fetchErr) {
      console.error('[invitation:GET] Fetch error:', fetchErr)
      throw fetchErr
    }

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found or invalid link' }, { status: 404 })
    }

    if (invite.state === 'revoked') {
      return NextResponse.json({ error: 'This invitation has been revoked by the sender', code: 'revoked' }, { status: 403 })
    }

    if (invite.state === 'declined') {
      return NextResponse.json({ error: 'You have already declined this invitation', code: 'declined' }, { status: 403 })
    }

    if (['accepted', 'onboarding', 'completed'].includes(invite.state)) {
      return NextResponse.json({ 
        error: 'This invitation has already been accepted', 
        code: 'accepted',
        project_slug: (invite.project as any)?.slug 
      }, { status: 403 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      if (invite.state !== 'expired') {
        await supabase.from('project_team_invitations').update({ state: 'expired' }).eq('id', invite.id)
      }
      return NextResponse.json({ error: 'This invitation has expired', code: 'expired' }, { status: 403 })
    }

    let identityMatch = false
    let requiresRelogin = false

    if (user) {
      const isUserIdMatch = invite.invited_user_id === user.id
      const isEmailMatch = invite.invited_email && user.email && invite.invited_email.toLowerCase() === user.email.toLowerCase()
      
      if (isUserIdMatch || isEmailMatch) {
        identityMatch = true
      } else if (invite.invited_user_id || invite.invited_email) {
        requiresRelogin = true
      }
    }

    const updates: Record<string, any> = {
      view_count: (invite.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString()
    }

    let stateChanged = false
    if (invite.state === 'sent') {
      updates.state = 'viewed'
      updates.first_viewed_at = updates.last_viewed_at
      stateChanged = true
    }

    Promise.resolve(
      supabase.from('project_team_invitations').update(updates).eq('id', invite.id).then(async (res) => {
        if (!res.error && stateChanged) {
          await supabase.from('project_team_invitation_events').insert({
            invitation_id: invite.id,
            event_type: 'viewed',
            from_state: 'sent',
            to_state: 'viewed',
            actor_id: user?.id || null,
            ip_address: request.headers.get('x-forwarded-for') || null,
            user_agent: request.headers.get('user-agent') || null
          })

          await supabase.from('notifications').insert({
            user_id: (invite.inviter as any).id,
            type: 'invitation_viewed',
            title: 'Invitation viewed',
            body: `${invite.invited_name || invite.invited_email || 'The recipient'} viewed your invitation to join ${(invite.project as any).name}.`,
            entity_type: 'invitation',
            entity_id: invite.id,
            link: `/projects/${(invite.project as any).slug}?tab=team&sub=invitations`,
            is_read: false
          })
        }
      })
    ).catch(e => console.error('[invitation:GET] Background update failed:', e))

    const response = {
      id: invite.id,
      project: invite.project,
      inviter: invite.inviter,
      personal_message: invite.personal_message,
      snapshot: invite.snapshot,
      invited_email: invite.invited_email,
      identity_match: identityMatch,
      requires_relogin: requiresRelogin,
      current_user_email: user?.email || null,
      is_authenticated: !!user
    }

    return NextResponse.json({ success: true, invitation: response })

  } catch (error: any) {
    console.error('[invitation:GET] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve invitation' },
      { status: 500 }
    )
  }
}