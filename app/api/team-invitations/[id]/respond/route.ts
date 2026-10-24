import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { InvitationSnapshot } from '@/types/team'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: token } = await context.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to respond' }, { status: 401 })
  }

  let body: { action: 'accept' | 'decline' }
  try {
    body = await request.json()
    if (body.action !== 'accept' && body.action !== 'decline') {
      throw new Error()
    }
  } catch {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  try {
    const { data: hashedToken, error: hashErr } = await supabase.rpc('hash_team_invitation_token', {
      p_token: token
    })
    if (hashErr || !hashedToken) throw new Error('Internal crypto error')

    const { data: invite, error: fetchErr } = await supabase
      .from('project_team_invitations')
      .select('*, project:projects(slug, name)')
      .eq('token_hash', hashedToken)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!invite) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

    if (invite.state === 'revoked') {
      return NextResponse.json({ error: 'This invitation has been revoked' }, { status: 403 })
    }
    if (invite.state === 'declined') {
      return NextResponse.json({ error: 'You already declined this invitation' }, { status: 403 })
    }
    if (['accepted', 'onboarding', 'completed'].includes(invite.state)) {
      return NextResponse.json({ error: 'This invitation was already accepted' }, { status: 403 })
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 403 })
    }

    const isUserIdMatch = invite.invited_user_id === user.id
    const isEmailMatch = invite.invited_email && user.email && invite.invited_email.toLowerCase() === user.email.toLowerCase()

    if (!isUserIdMatch && !isEmailMatch) {
      return NextResponse.json({ 
        error: 'Account mismatch. Please sign in with the email this invitation was sent to.' 
      }, { status: 403 })
    }

    if (body.action === 'decline') {
      const { error: updErr } = await supabase
        .from('project_team_invitations')
        .update({ 
          state: 'declined', 
          responded_at: new Date().toISOString() 
        })
        .eq('id', invite.id)

      if (updErr) throw updErr

      logEvent(supabase, invite.id, 'declined', invite.state, user.id, request)
      notifyOwner(supabase, invite.project_id, invite.inviter_id, 'declined', invite.project.name, user)

      return NextResponse.json({ success: true, state: 'declined' })
    }

    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id, member_state')
      .eq('project_id', invite.project_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingMember && !['removed', 'declined', 'revoked'].includes(existingMember.member_state)) {
      return NextResponse.json({ error: 'You are already a member of this team' }, { status: 409 })
    }

    const snapshot = invite.snapshot as InvitationSnapshot
    let memberId = existingMember?.id

    if (!memberId) {
      const { data: newMember, error: memErr } = await supabase
        .from('project_members')
        .insert({
          project_id: invite.project_id,
          user_id: user.id,
          role: snapshot.role_label,
          department: snapshot.department_name,
          seniority: snapshot.seniority,
          reports_to: snapshot.reports_to_member_id,
          is_lead: snapshot.is_lead,
          member_state: 'onboarding',
          working_model: snapshot.work_plan?.working_model,
          commitment_hours: snapshot.work_plan?.commitment_hours,
          start_date: snapshot.work_plan?.start_date,
          invited_by: invite.inviter_id,
          invited_at: invite.created_at,
          accepted_at: new Date().toISOString(),
          onboarding_complete: false,
        })
        .select('id')
        .single()

      if (memErr) {
        console.error('[respond:POST] Failed to create member:', memErr)
        throw new Error('Failed to create team member record')
      }
      memberId = newMember.id
    } else {
      await supabase
        .from('project_members')
        .update({
          role: snapshot.role_label,
          department: snapshot.department_name,
          seniority: snapshot.seniority,
          reports_to: snapshot.reports_to_member_id,
          is_lead: snapshot.is_lead,
          member_state: 'onboarding',
          working_model: snapshot.work_plan?.working_model,
          commitment_hours: snapshot.work_plan?.commitment_hours,
          start_date: snapshot.work_plan?.start_date,
          invited_by: invite.inviter_id,
          invited_at: invite.created_at,
          accepted_at: new Date().toISOString(),
          onboarding_complete: false,
        })
        .eq('id', memberId)
    }

    await supabase
      .from('project_team_invitations')
      .update({
        state: 'accepted',
        responded_at: new Date().toISOString(),
        created_member_id: memberId,
        invited_user_id: user.id 
      })
      .eq('id', invite.id)

    await supabase
      .from('project_team_onboarding')
      .insert({
        project_id: invite.project_id,
        member_id: memberId,
        invitation_id: invite.id,
        current_step: 'identity',
        steps_completed: []
      })

    Promise.resolve(
      supabase
        .from('project_permissions')
        .upsert({
          project_id: invite.project_id,
          user_id: user.id,
          can_view_applicants: !!snapshot.permissions?.team?.view,
          can_review_applicants: !!snapshot.permissions?.team?.manage_permissions,
          can_edit_graph: !!snapshot.permissions?.team?.view,
          can_post_updates: !!snapshot.permissions?.project?.edit,
          can_manage_members: !!snapshot.permissions?.team?.invite,
          can_manage_roles: !!snapshot.permissions?.team?.manage_permissions,
          granted_by: invite.inviter_id,
          granted_at: new Date().toISOString()
        }, { onConflict: 'project_id, user_id' })
    ).catch((e: any) => console.error('[respond:POST] Perms upsert failed:', e))

    logEvent(supabase, invite.id, 'accepted', invite.state, user.id, request)
    notifyOwner(supabase, invite.project_id, invite.inviter_id, 'accepted', invite.project.name, user)

    Promise.resolve(
      supabase.rpc('log_team_activity', {
        p_project_id: invite.project_id,
        p_actor_id: user.id,
        p_subject_member_id: memberId,
        p_event_type: 'invitation_accepted',
        p_title: `${user.user_metadata?.full_name || 'A user'} accepted the invitation`,
        p_summary: `Joining as ${snapshot.role_label}`,
        p_metadata: { role: snapshot.role_label }
      })
    ).catch((e: any) => console.error('[respond:POST] Activity log failed:', e))

    return NextResponse.json({ success: true, state: 'accepted', project_slug: invite.project.slug })

  } catch (error: any) {
    console.error('[respond:POST] Fatal:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process response' },
      { status: 500 }
    )
  }
}

function logEvent(supabase: any, inviteId: string, eventType: string, fromState: string, actorId: string, request: Request) {
  Promise.resolve(
    supabase.from('project_team_invitation_events').insert({
      invitation_id: inviteId,
      event_type: eventType,
      from_state: fromState,
      to_state: eventType === 'declined' ? 'declined' : 'accepted',
      actor_id: actorId,
      ip_address: request.headers.get('x-forwarded-for') || null,
      user_agent: request.headers.get('user-agent') || null
    })
  ).catch((e: any) => console.error('[respond:POST] Event log failed:', e))
}

function notifyOwner(supabase: any, projectId: string, ownerId: string, action: 'accepted' | 'declined', projectName: string, user: any) {
  const userName = user?.user_metadata?.full_name || user?.email || 'Someone'
  
  Promise.resolve(
    supabase.from('notifications').insert({
      user_id: ownerId,
      type: action === 'accepted' ? 'invitation_accepted' : 'invitation_declined',
      title: `Invitation ${action}`,
      body: `${userName} has ${action} your invitation to join ${projectName}.`,
      entity_type: 'project',
      entity_id: projectId,
      link: `/projects/${projectName}?tab=team&sub=people`,
      is_read: false
    })
  ).catch((e: any) => console.error('[respond:POST] Notification failed:', e))
}