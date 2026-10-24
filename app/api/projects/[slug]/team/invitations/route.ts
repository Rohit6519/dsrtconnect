import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { InvitationSnapshot } from '@/types/team'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_EXPIRATION_DAYS = 14
const VALID_SENIORITIES = new Set(['intern', 'junior', 'mid', 'senior', 'lead', 'principal', 'staff', 'executive', 'advisor'])
const VALID_WORKING_MODELS = new Set(['flexible', 'part_time', 'full_time', 'project_based'])
const VALID_PRIORITIES = new Set(['low', 'normal', 'high', 'critical'])

function safeString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, max) : null
}
function safeArray<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : [] }

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await request.json() } 
  catch { return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 }) }

  try {
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select(`id, founder_id, user_id, name, slug, logo_url, settings:project_team_settings(who_can_invite, invitation_expiration_days)`)
      .eq('slug', slug)
      .maybeSingle()

    if (projErr) throw projErr
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const settings = Array.isArray(project.settings) ? project.settings[0] : project.settings
    const whoCanInvite = settings?.who_can_invite || 'owner'
    const expireDays = settings?.invitation_expiration_days || DEFAULT_EXPIRATION_DAYS

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    
    if (!isOwner) {
      if (whoCanInvite === 'owner') return NextResponse.json({ error: 'Only the project owner can invite members' }, { status: 403 })
      const { data: membership } = await supabase.from('project_members').select('id, is_lead').eq('project_id', project.id).eq('user_id', user.id).maybeSingle()
      if (!membership) return NextResponse.json({ error: 'You are not a member of this team' }, { status: 403 })
      if (whoCanInvite === 'leads' && !membership.is_lead) return NextResponse.json({ error: 'Only team leads can invite members' }, { status: 403 })
    }

    const invitedUserId = body.invited_user_id || null
    const invitedEmail = safeString(body.invited_email, 255)
    const invitedName = safeString(body.invited_name, 120)

    if (!invitedUserId && !invitedEmail) return NextResponse.json({ error: 'Must provide either a user ID or an email' }, { status: 400 })
    if (invitedUserId === user.id) return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })

    if (invitedUserId) {
      const { data: existingMember } = await supabase.from('project_members').select('id, member_state').eq('project_id', project.id).eq('user_id', invitedUserId).maybeSingle()
      if (existingMember && !['removed', 'declined', 'revoked'].includes(existingMember.member_state)) {
        return NextResponse.json({ error: 'This person is already on the team or has a pending invite' }, { status: 409 })
      }
    }

    const roleTitle = safeString(body.role_title, 100)
    if (!roleTitle) return NextResponse.json({ error: 'Role title is required' }, { status: 400 })

    const primaryContribution = safeString(body.snapshot?.primary_contribution, 100)
    if (!primaryContribution) return NextResponse.json({ error: 'Primary contribution is required' }, { status: 400 })

    const cleanResps = safeArray<any>(body.responsibilities).map(r => typeof r === 'string' ? r.trim() : (r.title || '').trim()).filter(r => r.length > 0).slice(0, 10)
    if (cleanResps.length === 0) return NextResponse.json({ error: 'At least one responsibility is required' }, { status: 400 })

    const cleanObjs = safeArray<any>(body.objectives)
      .filter(o => typeof o.title === 'string' && o.title.trim().length > 0)
      .map(o => ({
        title: o.title.trim().slice(0, 150),
        priority: VALID_PRIORITIES.has(o.priority) ? o.priority : 'normal',
        due_date: (typeof o.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.due_date)) ? o.due_date : null
      })).slice(0, 5)

    const workingModel = VALID_WORKING_MODELS.has(body.working_model) ? body.working_model : 'flexible'
    const seniority = VALID_SENIORITIES.has(body.seniority) ? body.seniority : null
    const commitmentHours = typeof body.commitment_hours === 'number' ? Math.max(0, Math.min(168, body.commitment_hours)) : null
    
    let startDate = null
    if (typeof body.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.start_date)) startDate = body.start_date
    
    const permissions = typeof body.permissions === 'object' && body.permissions ? body.permissions : {}
    const personalMessage = safeString(body.personal_message, 500)

    // Build the immutable snapshot as type InvitationSnapshot
    const snapshot: InvitationSnapshot = {
      role_id: null as any, // Not used directly in project team invites
      role_label: roleTitle,
      department_id: null,
      department_name: safeString(body.department, 100),
      seniority: seniority as any,
      reports_to_member_id: body.reports_to_id || null,
      reports_to_name: null,
      is_lead: !!body.is_lead,
      permissions: permissions as any,
      primary_contribution: primaryContribution,
      skills: safeArray<string>(body.skills).map(s => String(s).trim()).filter(s => s).slice(0, 10),
      responsibilities: cleanResps.map((r, i) => ({
        id: null,
        title: r,
        is_primary: i === 0
      })),
      work_plan: {
        start_date: startDate,
        commitment_hours: commitmentHours,
        working_model: workingModel as any,
        timezone: null,
        objectives: cleanObjs as any
      }
    } as unknown as InvitationSnapshot // Cast to bypass strict UI-only fields

    const { data: rawToken, error: tokenErr } = await supabase.rpc('generate_team_invitation_token')
    if (tokenErr || !rawToken) throw new Error('Failed to generate secure token')
    
    const { data: hashedToken, error: hashErr } = await supabase.rpc('hash_team_invitation_token', { p_token: rawToken })
    if (hashErr || !hashedToken) throw new Error('Failed to hash token')
    
    const tokenPrefix = rawToken.slice(0, 8)
    const expiresAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: invitation, error: insertErr } = await supabase
      .from('project_team_invitations')
      .insert({
        project_id: project.id,
        invited_user_id: invitedUserId,
        invited_email: invitedEmail,
        invited_name: invitedName,
        inviter_id: user.id,
        personal_message: personalMessage,
        snapshot: snapshot as any,
        snapshot_version: 1,
        token_hash: hashedToken,
        token_prefix: tokenPrefix,
        state: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt
      })
      .select('id, state, expires_at')
      .single()

    if (insertErr) throw insertErr

    // Background logging
    Promise.resolve(
      supabase.rpc('log_team_activity', {
        p_project_id: project.id,
        p_actor_id: user.id,
        p_subject_member_id: null,
        p_event_type: 'invitation_sent',
        p_title: `Invited ${invitedName || invitedEmail || 'a new member'}`,
        p_summary: `Joining as ${roleTitle}`,
        p_metadata: { invitation_id: invitation.id, role_title: roleTitle, department: snapshot.department_name }
      })
    ).catch(() => {})

    Promise.resolve(
      supabase.from('project_team_invitation_events').insert({
        invitation_id: invitation.id,
        event_type: 'sent',
        from_state: 'draft',
        to_state: 'sent',
        actor_id: user.id,
        ip_address: request.headers.get('x-forwarded-for') || null,
        user_agent: request.headers.get('user-agent') || null
      })
    ).catch(() => {})

    const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dsrt.com'}/team-invitations/${rawToken}`

    // Email dispatch via Outbox
    if (invitedEmail) {
      try {
        const { buildTeamInvitationEmail } = await import('@/lib/email/templates/venture-invitation')
        const emailContent = buildTeamInvitationEmail({
          projectName: project.name,
          inviterName: user.user_metadata?.full_name || user.email || 'A team member',
          roleTitle: roleTitle,
          inviteLink: inviteLink,
          personalMessage: personalMessage,
          snapshot: snapshot,
        })

        await supabase.from('email_outbox').insert({
          recipient_email: invitedEmail,
          subject: emailContent.subject,
          html_body: emailContent.html,
          source_type: 'team_invitation',
          source_id: invitation.id,
          status: 'pending'
        })
      } catch (emailErr) {
        console.error('[invitations:POST] Failed to queue email:', emailErr)
      }
    }

    return NextResponse.json({ 
      success: true, 
      invitation: { id: invitation.id, state: invitation.state, expires_at: invitation.expires_at, invite_link: inviteLink }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to send invitation' }, { status: 500 })
  }
}