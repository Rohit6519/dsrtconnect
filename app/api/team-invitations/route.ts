import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackOpportunityEvent, writeOpportunityAudit } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

/**
 * POST /api/team-invitations
 * Creates a team invitation for a SELECTED applicant.
 * 
 * Body: {
 *   application_id: string    — the selected application
 *   destination_type: 'project' | 'venture'
 *   destination_id: string    — project.id or venture.id  
 *   role?: string             — team role label
 *   start_date?: string       — ISO date
 *   message?: string          — personal message
 *   expires_at?: string       — ISO timestamp
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const {
    application_id,
    destination_type,
    destination_id,
    role = 'member',
    start_date,
    message,
    expires_at,
  } = body

  // ── 1. Input Validation ──
  if (!application_id) return NextResponse.json({ error: 'application_id is required' }, { status: 400 })
  if (!destination_type || !['project', 'venture'].includes(destination_type)) {
    return NextResponse.json({ error: 'destination_type must be "project" or "venture"' }, { status: 400 })
  }
  if (!destination_id) return NextResponse.json({ error: 'destination_id is required' }, { status: 400 })

  try {
    // ── 2. Load Application ──
    const { data: app } = await supabase
      .from('opportunity_applications')
      .select('id, opportunity_id, applicant_id, pipeline_stage')
      .eq('id', application_id)
      .single()

    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    // Application MUST be in "accepted" (selected) stage
    if (app.pipeline_stage !== 'accepted') {
      return NextResponse.json({ 
        error: 'Applicant must be in "Selected" stage before sending a team invitation.',
        current_stage: app.pipeline_stage 
      }, { status: 400 })
    }

    // ── 3. Load Opportunity & Verify Employer ──
    const { data: opp } = await supabase
      .from('opportunities')
      .select('id, poster_user_id, project_id, venture_id, title')
      .eq('id', app.opportunity_id)
      .single()

    if (!opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    // Verify the current user is the opportunity owner or manager
    let isAuthorized = opp.poster_user_id === user.id
    if (!isAuthorized) {
      const { data: member } = await supabase
        .from('opportunity_members')
        .select('role')
        .eq('opportunity_id', opp.id)
        .eq('user_id', user.id)
        .maybeSingle()
      isAuthorized = !!member && ['owner', 'admin', 'manager'].includes(member.role)
    }
    if (!isAuthorized) {
      return NextResponse.json({ error: 'You are not authorized to manage this opportunity' }, { status: 403 })
    }

    // ── 4. Verify Destination Ownership ──
    let destinationName = ''

    if (destination_type === 'project') {
      const { data: project } = await supabase
        .from('projects')
        .select('id, name, founder_id, user_id')
        .eq('id', destination_id)
        .single()

      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      if (project.founder_id !== user.id && project.user_id !== user.id) {
        return NextResponse.json({ error: 'You do not own this project' }, { status: 403 })
      }
      destinationName = project.name
    } else {
      const { data: venture } = await supabase
        .from('ventures')
        .select('id, name, user_id, founder_id')
        .eq('id', destination_id)
        .single()

      if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })
      if (venture.user_id !== user.id && venture.founder_id !== user.id) {
        return NextResponse.json({ error: 'You do not own this venture' }, { status: 403 })
      }
      destinationName = venture.name
    }

    // ── 5. Duplicate Prevention ──
    const { data: existingPending } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('invitee_id', app.applicant_id)
      .eq('destination_type', destination_type)
      .eq('destination_id', destination_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingPending) {
      return NextResponse.json({ 
        error: 'A team invitation is already pending for this user and destination.',
        existing_invitation_id: existingPending.id 
      }, { status: 409 })
    }

    // ── 6. Existing Membership Check ──
    if (destination_type === 'project') {
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', destination_id)
        .eq('user_id', app.applicant_id)
        .maybeSingle()

      if (existingMember) {
        return NextResponse.json({ error: 'This user is already a member of this project.' }, { status: 409 })
      }
    } else {
      const { data: existingMember } = await supabase
        .from('venture_team_members')
        .select('id')
        .eq('venture_id', destination_id)
        .eq('user_id', app.applicant_id)
        .maybeSingle()

      if (existingMember) {
        return NextResponse.json({ error: 'This user is already a member of this venture.' }, { status: 409 })
      }
    }

    // ── 7. Create the Invitation ──
    const { data: invitation, error: insertError } = await supabase
      .from('team_invitations')
      .insert({
        application_id,
        opportunity_id: opp.id,
        inviter_id: user.id,
        invitee_id: app.applicant_id,
        destination_type,
        destination_id,
        destination_name: destinationName,
        role: String(role).slice(0, 60),
        start_date: start_date || null,
        message: message ? String(message).slice(0, 2000) : null,
        status: 'pending',
        expires_at: expires_at || null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // ── 8. Create DSRT Mail Message ──
    const { data: inviterProfile } = await supabase
      .from('users')
      .select('full_name, username')
      .eq('id', user.id)
      .single()

    const inviterName = inviterProfile?.full_name || inviterProfile?.username || 'An employer'

    const mailSubject = `Team invitation: Join ${destinationName} as ${role}`
    const mailBody = [
      `${inviterName} has invited you to join **${destinationName}** as a **${role}**.`,
      '',
      message ? `> ${message}` : '',
      '',
      start_date ? `Start date: ${new Date(start_date).toLocaleDateString()}` : '',
      '',
      `This invitation was created because you were selected for the opportunity: "${opp.title}".`,
    ].filter(Boolean).join('\n')

    try {
      const { data: mailMsg } = await supabase
        .from('inbox_messages')
        .insert({
          recipient_id: app.applicant_id,
          sender_id: user.id,
          message_type: 'team_invitation',
          status: 'unread',
          subject: mailSubject,
          body: mailBody.slice(0, 5000),
          reference_type: 'team_invitation',
          reference_id: invitation.id,
          reference_name: destinationName,
          metadata: {
            team_invitation_id: invitation.id,
            application_id,
            opportunity_id: opp.id,
            destination_type,
            destination_id,
            destination_name: destinationName,
            role,
          },
        })
        .select('id')
        .single()

      // Link mail message back to invitation
      if (mailMsg) {
        await supabase
          .from('team_invitations')
          .update({ mail_message_id: mailMsg.id })
          .eq('id', invitation.id)
      }
    } catch (e) {
      console.error('Mail creation failed (invitation still valid):', e)
    }

    // ── 9. Create Notification ──
    try {
      await supabase.from('notifications').insert({
        user_id: app.applicant_id,
        type: 'team_invitation',
        from_user_id: user.id,
        entity_type: destination_type,
        entity_id: destination_id,
        title: `Invited to join ${destinationName}`,
        message: `${inviterName} invited you to join ${destinationName} as ${role}`,
        action_url: `/looking-for/my-applications/${application_id}`,
      })
    } catch (e) {
      console.error('Notification failed (invitation still valid):', e)
    }

    // ── 10. Record in Application History ──
    try {
      await supabase.from('opportunity_application_history').insert({
        application_id,
        opportunity_id: opp.id,
        from_stage: 'accepted',
        to_stage: 'accepted',
        changed_by: user.id,
        reason: `Team invitation sent to join ${destinationName} as ${role}`,
        metadata: { team_invitation_id: invitation.id },
      })
    } catch {}

    // ── 11. Track Event ──
    await trackOpportunityEvent({
      opportunity_id: opp.id,
      user_id: user.id,
      event_type: 'team_invitation_created' as any,
      source: 'team_invitations',
      metadata: {
        invitation_id: invitation.id,
        application_id,
        destination_type,
        destination_id,
        role,
      },
    }).catch(() => {})

    // ── 12. Audit ──
    await writeOpportunityAudit({
      opportunity_id: opp.id,
      actor_id: user.id,
      action: 'team_invitation_created',
      target_type: 'team_invitation',
      target_id: invitation.id,
      after_state: { destination_type, destination_id, role, invitee_id: app.applicant_id },
    }).catch(() => {})

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (e: any) {
    console.error('Create invitation error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to create invitation' }, { status: 500 })
  }
}