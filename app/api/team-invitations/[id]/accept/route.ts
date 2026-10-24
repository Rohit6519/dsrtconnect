import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackOpportunityEvent, writeOpportunityAudit } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // ── 1. Load Invitation ──
    const { data: invitation } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('id', id)
      .single()

    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

    // ── 2. Authorization: Only invitee can accept ──
    if (invitation.invitee_id !== user.id) {
      return NextResponse.json({ error: 'Only the invited person can accept this invitation' }, { status: 403 })
    }

    // ── 3. State Validation ──
    if (invitation.status === 'accepted') {
      // Idempotent: already accepted, return success
      return NextResponse.json({ ok: true, already_accepted: true, invitation })
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ 
        error: `Cannot accept an invitation with status "${invitation.status}"`,
        status: invitation.status 
      }, { status: 400 })
    }

    // ── 4. Expiration Check ──
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await supabase.from('team_invitations').update({ status: 'expired' }).eq('id', id)
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
    }

    // ── 5. Destination Still Exists? ──
    if (invitation.destination_type === 'project') {
      const { data: project } = await supabase.from('projects').select('id').eq('id', invitation.destination_id).single()
      if (!project) return NextResponse.json({ error: 'Project no longer exists' }, { status: 404 })
    } else {
      const { data: venture } = await supabase.from('ventures').select('id').eq('id', invitation.destination_id).single()
      if (!venture) return NextResponse.json({ error: 'Venture no longer exists' }, { status: 404 })
    }

    // ── 6. Already a Member? (Idempotent) ──
    let existingMembership = null
    if (invitation.destination_type === 'project') {
      const { data: m } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', invitation.destination_id)
        .eq('user_id', user.id)
        .maybeSingle()
      existingMembership = m
    } else {
      const { data: m } = await supabase
        .from('venture_team_members')
        .select('id')
        .eq('venture_id', invitation.destination_id)
        .eq('user_id', user.id)
        .maybeSingle()
      existingMembership = m
    }

    let membershipId = existingMembership?.id || null
    let membershipType = invitation.destination_type === 'project' ? 'project_member' : 'venture_team_member'

    // ── 7. Create Membership (if not already a member) ──
    if (!existingMembership) {
      if (invitation.destination_type === 'project') {
        const { data: newMember, error: memberErr } = await supabase
          .from('project_members')
          .insert({
            project_id: invitation.destination_id,
            user_id: user.id,
            role: invitation.role || 'member',
          })
          .select('id')
          .single()

        if (memberErr) throw memberErr
        membershipId = newMember.id
      } else {
        // Venture uses venture_team_members with additional fields
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single()

        const { data: newMember, error: memberErr } = await supabase
          .from('venture_team_members')
          .insert({
            venture_id: invitation.destination_id,
            user_id: user.id,
            name: profile?.full_name || 'Team Member',
            avatar_url: profile?.avatar_url || null,
            role: invitation.role || 'Team Member',
            status: 'active',
          })
          .select('id')
          .single()

        if (memberErr) throw memberErr
        membershipId = newMember.id
      }
    }

    // ── 8. Mark Invitation as Accepted ──
    const { data: updatedInvitation, error: updateErr } = await supabase
      .from('team_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        membership_id: membershipId,
        membership_type: membershipType,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr

    // ── 9. Record in Application History ──
    try {
      await supabase.from('opportunity_application_history').insert({
        application_id: invitation.application_id,
        opportunity_id: invitation.opportunity_id,
        from_stage: 'accepted',
        to_stage: 'accepted',
        changed_by: user.id,
        reason: `Accepted team invitation. Joined ${invitation.destination_name} as ${invitation.role}`,
        metadata: { team_invitation_id: id, membership_id: membershipId },
      })
    } catch {}

    // ── 10. Notify Employer ──
    try {
      const { data: inviteeProfile } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('id', user.id)
        .single()

      const inviteeName = inviteeProfile?.full_name || inviteeProfile?.username || 'The applicant'

      await supabase.from('notifications').insert({
        user_id: invitation.inviter_id,
        type: 'team_invitation_accepted',
        from_user_id: user.id,
        entity_type: invitation.destination_type,
        entity_id: invitation.destination_id,
        title: `${inviteeName} joined ${invitation.destination_name}`,
        message: `${inviteeName} accepted your team invitation and joined as ${invitation.role}`,
        action_url: invitation.destination_type === 'project'
          ? `/projects/${invitation.destination_id}`
          : `/ventures/${invitation.destination_id}`,
      })

      // Also send DSRT Mail notification
      await supabase.from('inbox_messages').insert({
        recipient_id: invitation.inviter_id,
        sender_id: user.id,
        message_type: 'team_invitation_accepted',
        status: 'unread',
        subject: `${inviteeName} joined ${invitation.destination_name}`,
        body: `${inviteeName} has accepted your invitation to join ${invitation.destination_name} as ${invitation.role}.`,
        reference_type: 'team_invitation',
        reference_id: id,
        reference_name: invitation.destination_name,
        metadata: { team_invitation_id: id, membership_id: membershipId },
      })
    } catch (e) {
      console.error('Acceptance notification failed (membership still valid):', e)
    }

    // ── 11. Track Events ──
    await trackOpportunityEvent({
      opportunity_id: invitation.opportunity_id,
      user_id: user.id,
      event_type: 'team_invitation_accepted' as any,
      source: 'team_invitations',
      metadata: {
        invitation_id: id,
        destination_type: invitation.destination_type,
        destination_id: invitation.destination_id,
        membership_id: membershipId,
      },
    }).catch(() => {})

    await writeOpportunityAudit({
      opportunity_id: invitation.opportunity_id,
      actor_id: user.id,
      action: 'team_invitation_accepted',
      target_type: 'team_invitation',
      target_id: id,
      after_state: { membership_id: membershipId, membership_type: membershipType },
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      invitation: updatedInvitation,
      membership_id: membershipId,
      destination_type: invitation.destination_type,
      destination_id: invitation.destination_id,
      destination_name: invitation.destination_name,
    })
  } catch (e: any) {
    console.error('Accept invitation error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to accept invitation' }, { status: 500 })
  }
}