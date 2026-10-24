import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackOpportunityEvent } from '@/lib/events/opportunity-events'
import { WorkflowService } from '@/lib/applications/WorkflowService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/opportunities/[id]/apply
 * Submit an application
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  try {
    // Load opportunity
    const { data: opportunity } = await supabase
      .from('opportunities')
      .select(
        'id, title, slug, poster_user_id, status, applications_open, application_deadline, max_applications, application_count, project_id, venture_id'
      )
      .eq('id', id)
      .single()

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    // Guards
    if (opportunity.poster_user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot apply to your own opportunity' },
        { status: 400 }
      )
    }
    if (!opportunity.applications_open) {
      return NextResponse.json({ error: 'Applications are closed' }, { status: 400 })
    }
    if (opportunity.status !== 'active' && opportunity.status !== 'closing-soon') {
      return NextResponse.json(
        { error: 'Opportunity is not accepting applications' },
        { status: 400 }
      )
    }
    if (
      opportunity.application_deadline &&
      new Date(opportunity.application_deadline) < new Date()
    ) {
      return NextResponse.json(
        { error: 'Application deadline has passed' },
        { status: 400 }
      )
    }
    if (
      opportunity.max_applications &&
      opportunity.application_count >= opportunity.max_applications
    ) {
      return NextResponse.json(
        { error: 'Maximum applications reached' },
        { status: 400 }
      )
    }

    // Duplicate check
    const { data: existing } = await supabase
      .from('opportunity_applications')
      .select('id')
      .eq('opportunity_id', id)
      .eq('applicant_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already applied' }, { status: 409 })
    }

    // Snapshot applicant profile
    const { data: applicantProfile } = await supabase
      .from('users')
      .select(
        'full_name, username, avatar_url, tagline, bio, location, is_verified'
      )
      .eq('id', user.id)
      .single()

    const applicantSnapshot = {
      ...applicantProfile,
      snapshot_at: new Date().toISOString(),
    }

    // Insert application
    const { data: application, error } = await supabase
      .from('opportunity_applications')
      .insert({
        opportunity_id: id,
        applicant_id: user.id,
        cover_message: body.cover_message?.trim() || null,
        cover_letter: body.cover_letter?.trim() || null,
        portfolio_url: body.portfolio_url || null,
        github_url: body.github_url || null,
        linkedin_url: body.linkedin_url || null,
        website_url: body.website_url || null,
        resume_url: body.resume_url || null,
        attachments: body.attachments || [],
        proposed_compensation: body.proposed_compensation || null,
        proposed_compensation_type: body.proposed_compensation_type || null,
        availability: body.availability || null,
        expected_hours: body.expected_hours || null,
        proposed_start_date: body.proposed_start_date || null,
        answers: body.answers || {},
        highlighted_skills: body.highlighted_skills || [],
        highlighted_projects: body.highlighted_projects || [],
        highlighted_ventures: body.highlighted_ventures || [],
        applicant_snapshot: applicantSnapshot,
        pipeline_stage: 'submitted',
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Create inbox message for poster
    const applicantName =
      applicantProfile?.full_name || applicantProfile?.username || 'A builder'

    const messageBody = [
      applicantName + ' just applied to "' + opportunity.title + '".',
      '',
      body.cover_message ? 'Message:\n' + body.cover_message : '',
      body.cover_letter ? '\nCover letter:\n' + body.cover_letter : '',
      body.availability ? '\nAvailability: ' + body.availability : '',
      body.expected_hours ? 'Hours per week: ' + body.expected_hours : '',
    ]
      .filter(Boolean)
      .join('\n')

    // Determine reference context
    let referenceType = 'opportunity'
    let referenceId: string = id
    let referenceName = opportunity.title
    let referenceSlug: string | null = opportunity.slug

    if (opportunity.project_id) {
      referenceType = 'project'
      referenceId = opportunity.project_id
      const { data: proj } = await supabase
        .from('projects')
        .select('name, slug')
        .eq('id', opportunity.project_id)
        .single()
      referenceName = proj?.name || opportunity.title
      referenceSlug = proj?.slug || null
    } else if (opportunity.venture_id) {
      referenceType = 'venture'
      referenceId = opportunity.venture_id
      const { data: vent } = await supabase
        .from('ventures')
        .select('name, slug')
        .eq('id', opportunity.venture_id)
        .single()
      referenceName = vent?.name || opportunity.title
      referenceSlug = vent?.slug || null
    }

    await supabase
      .from('inbox_messages')
      .insert({
        recipient_id: opportunity.poster_user_id,
        sender_id: user.id,
        message_type: 'role_application',
        status: 'unread',
        subject: 'New applicant for ' + opportunity.title.slice(0, 180),
        body: messageBody.slice(0, 5000),
        reference_type: referenceType,
        reference_id: referenceId,
        reference_name: referenceName,
        reference_slug: referenceSlug,
        metadata: {
          opportunity_application_id: application.id,
          opportunity_id: id,
          opportunity_title: opportunity.title,
          opportunity_slug: opportunity.slug,
          portfolio_url: body.portfolio_url,
          github_url: body.github_url,
          linkedin_url: body.linkedin_url,
          resume_url: body.resume_url,
        },
      })
      .then(
        () => {},
        (e) => console.error('Inbox insert failed:', e)
      )

    // Track signal for algorithm
    await supabase
      .from('user_activity_signals')
      .insert({
        user_id: user.id,
        signal_type: 'apply_submitted',
        entity_type: 'opportunity',
        entity_id: id,
        weight: 12.0,
      })
      .then(
        () => {},
        () => {}
      )

    // Manage cockpit + analytics event (idempotent)
    await trackOpportunityEvent({
      event_id: body.event_id || undefined,
      opportunity_id: id,
      user_id: user.id,
      session_id: body.session_id || null,
      event_type: 'application_submitted',
      source: body.source || 'apply_modal',
      referrer_url: body.referrer_url || null,
      metadata: {
        application_id: application.id,
        availability: body.availability || null,
        expected_hours: body.expected_hours || null,
      },
    }).catch(() => ({ ok: false }))

    return NextResponse.json({ application }, { status: 201 })
  } catch (e: any) {
    console.error('Apply error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

/**
 * GET /api/opportunities/[id]/apply
 * Check if current user has applied
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ applied: false })

  const { data } = await supabase
    .from('opportunity_applications')
    .select('id, pipeline_stage, status, created_at, updated_at')
    .eq('opportunity_id', id)
    .eq('applicant_id', user.id)
    .maybeSingle()

  return NextResponse.json({ applied: !!data, application: data })
}

/**
 * DELETE /api/opportunities/[id]/apply
 * Withdraw application
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: existing } = await supabase
      .from('opportunity_applications')
      .select('id, pipeline_stage')
      .eq('opportunity_id', id)
      .eq('applicant_id', user.id)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    await WorkflowService.transition({
      application_id: existing.id,
      target_stage: 'withdrawn',
      actor_id: user.id,
      source: 'withdraw_endpoint',
      reason: 'applicant_withdraw',
      options: {
        notify_owner: true,
        notify_owner_in_app: true,
        notify_candidate: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Withdraw error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}