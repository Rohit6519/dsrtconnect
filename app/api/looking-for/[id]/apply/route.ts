import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/looking-for/[id]/apply
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const {
    source_type = 'team_up',
    message, cover_letter, resume_url, portfolio_url,
    github_url, linkedin_url, availability, expected_hours,
    answers = {},
  } = body

  // ─── Load opportunity details (needed for inbox + validation) ───
  const { data: opportunity, error: oppErr } = await supabase
    .from('team_up_unified')
    .select('*')
    .eq('source_type', source_type)
    .eq('source_id', id)
    .single()

  if (oppErr || !opportunity) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  // Own opportunity guard
  if (opportunity.owner_id === user.id) {
    return NextResponse.json({ error: 'Cannot apply to your own opportunity' }, { status: 400 })
  }

  // Visibility check on team_up_requests
  if (source_type === 'team_up') {
    const { data: req } = await supabase.from('team_up_requests')
      .select('visibility, applications_open, application_deadline, user_id')
      .eq('id', id).single()
    if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (req.applications_open === false) return NextResponse.json({ error: 'Applications are closed' }, { status: 400 })
    if (req.application_deadline && new Date(req.application_deadline) < new Date())
      return NextResponse.json({ error: 'Application deadline has passed' }, { status: 400 })

    if (req.visibility === 'verified_only') {
      const { data: me } = await supabase.from('users').select('is_verified').eq('id', user.id).single()
      if (!me?.is_verified) return NextResponse.json({ error: 'Only verified builders can apply' }, { status: 403 })
    }
    if (req.visibility === 'invite_only') {
      const { data: inv } = await supabase.from('team_up_invitations')
        .select('id').eq('source_type', 'team_up').eq('source_id', id)
        .eq('to_user_id', user.id).in('status', ['pending', 'accepted']).maybeSingle()
      if (!inv) return NextResponse.json({ error: 'This opportunity is invite only' }, { status: 403 })
    }
  }

  // ─── Duplicate application check ───
  const filter: any = { applicant_id: user.id }
  if (source_type === 'team_up') filter.request_id = id
  else if (source_type === 'venture_lf') filter.venture_lf_id = id
  else if (source_type === 'project_role') filter.project_role_id = id

  const { data: existing } = await supabase.from('looking_for_applications')
    .select('id').match(filter).maybeSingle()

  if (existing) return NextResponse.json({ error: 'Already applied' }, { status: 409 })

  // ─── Insert application ───
  const insertPayload: any = {
    applicant_id: user.id, source_type, message, cover_letter,
    resume_url, portfolio_url, github_url, linkedin_url,
    availability, expected_hours, answers,
    pipeline_stage: 'applied', status: 'pending',
  }

  if (source_type === 'team_up') insertPayload.request_id = id
  else if (source_type === 'venture_lf') insertPayload.venture_lf_id = id
  else if (source_type === 'project_role') insertPayload.project_role_id = id

  const { data: application, error } = await supabase.from('looking_for_applications')
    .insert(insertPayload).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ═══════════════════════════════════════════════════════════════
  // NEW (Batch 9e): Create inbox message for opportunity owner
  // Unified inbox — same pattern as Batch 9a project apply
  // ═══════════════════════════════════════════════════════════════
  if (opportunity.owner_id && opportunity.owner_id !== user.id) {
    // Fetch applicant details
    const { data: applicant } = await supabase
      .from('users')
      .select('full_name, username')
      .eq('id', user.id)
      .single()

    const applicantName = applicant?.full_name || applicant?.username || 'A builder'
    const opportunityTitle = opportunity.title || 'your opportunity'

    // Determine context for reference fields
    let referenceType = 'looking_for'
    let referenceId: string = id
    let referenceName = opportunityTitle
    let referenceSlug: string | null = null

    if (source_type === 'venture_lf' && opportunity.venture_id) {
      referenceType = 'venture'
      referenceId = opportunity.venture_id
      const { data: venture } = await supabase
        .from('ventures')
        .select('name, slug')
        .eq('id', opportunity.venture_id)
        .single()
      referenceName = venture?.name || opportunityTitle
      referenceSlug = venture?.slug || null
    } else if (source_type === 'project_role' && opportunity.project_id) {
      referenceType = 'project'
      referenceId = opportunity.project_id
      const { data: project } = await supabase
        .from('projects')
        .select('name, slug')
        .eq('id', opportunity.project_id)
        .single()
      referenceName = project?.name || opportunityTitle
      referenceSlug = project?.slug || null
    }

    const subject = 'New applicant for ' + opportunityTitle
    const messageBody = [
      applicantName + ' just applied for "' + opportunityTitle + '".',
      '',
      (message || cover_letter) ? 'Their message:\n' + (message || cover_letter) : '',
      availability ? '\nAvailability: ' + availability : '',
      expected_hours ? '\nExpected hours: ' + expected_hours + ' hrs/week' : '',
    ].filter(Boolean).join('\n')

    await supabase
      .from('inbox_messages')
      .insert({
        recipient_id: opportunity.owner_id,
        sender_id: user.id,
        message_type: 'role_application',
        status: 'unread',
        subject: subject.slice(0, 200),
        body: messageBody.slice(0, 5000),
        reference_type: referenceType,
        reference_id: referenceId,
        reference_name: referenceName,
        reference_slug: referenceSlug,
        metadata: {
          looking_for_application_id: application.id,
          looking_for_source_type: source_type,
          looking_for_source_id: id,
          opportunity_title: opportunityTitle,
          portfolio_url,
          github_url,
          linkedin_url,
          resume_url,
        },
      })
      .then(() => {}, (e) => console.error('LF inbox message failed:', e))
  }

  // ═══════════════════════════════════════════════════════════════
  // NEW (Batch 9e): Track signal for recommendation algorithm
  // ═══════════════════════════════════════════════════════════════
  await supabase.from('user_activity_signals').insert({
    user_id: user.id,
    signal_type: 'apply_submitted',
    entity_type: 'looking_for',
    entity_id: id,
    weight: 12.0,
    metadata: {
      source_type,
      opportunity_title: opportunity.title,
    },
  }).then(() => {}, () => {})

  // Refresh scoring cache (existing behavior)
  try {
    await supabase.rpc('fn_calculate_team_up_score', {
      p_user_id: user.id,
      p_source_type: source_type,
      p_source_id: id,
    })
  } catch {}

  return NextResponse.json({ application }, { status: 201 })
}

// GET /api/looking-for/[id]/apply
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ applied: false })

  const { searchParams } = new URL(req.url)
  const source_type = searchParams.get('source') || 'team_up'

  const filter: any = { applicant_id: user.id }
  if (source_type === 'team_up') filter.request_id = id
  else if (source_type === 'venture_lf') filter.venture_lf_id = id
  else if (source_type === 'project_role') filter.project_role_id = id

  const { data } = await supabase.from('looking_for_applications')
    .select('id, pipeline_stage, status, created_at').match(filter).maybeSingle()

  return NextResponse.json({ applied: !!data, application: data })
}

// DELETE (withdraw application)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const source_type = searchParams.get('source') || 'team_up'

  const filter: any = { applicant_id: user.id }
  if (source_type === 'team_up') filter.request_id = id
  else if (source_type === 'venture_lf') filter.venture_lf_id = id
  else if (source_type === 'project_role') filter.project_role_id = id

  const { error } = await supabase.from('looking_for_applications')
    .update({ pipeline_stage: 'withdrawn', status: 'withdrawn' }).match(filter)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Track withdrawal signal
  await supabase.from('user_activity_signals').insert({
    user_id: user.id,
    signal_type: 'apply_withdrawn',
    entity_type: 'looking_for',
    entity_id: id,
    weight: -3.0,
  }).then(() => {}, () => {})

  return NextResponse.json({ success: true })
}