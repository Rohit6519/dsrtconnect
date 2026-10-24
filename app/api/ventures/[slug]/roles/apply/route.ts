import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.role_id) return NextResponse.json({ error: 'role_id required' }, { status: 400 })

  // Fetch venture with founder info
  const { data: venture, error: vErr } = await supabase
    .from('ventures')
    .select('id, name, slug, founder_id, user_id')
    .eq('slug', slug)
    .single()

  if (vErr || !venture) {
    return NextResponse.json({ error: 'Venture not found' }, { status: 404 })
  }

  // Fetch the role details for the message subject
  const { data: role } = await supabase
    .from('venture_looking_for')
    .select('id, title, type')
    .eq('id', body.role_id)
    .single()

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  // Check not already applied
  const { data: existing } = await supabase
    .from('venture_role_applications')
    .select('id')
    .eq('role_id', body.role_id)
    .eq('applicant_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Already applied' }, { status: 409 })

  // Insert application
  const { data: application, error: appErr } = await supabase
    .from('venture_role_applications')
    .insert({
      venture_id: venture.id,
      role_id: body.role_id,
      applicant_id: user.id,
      cover_letter: body.cover_letter || null,
      resume_url: body.resume_url || null,
      portfolio_url: body.portfolio_url || null,
      github_url: body.github_url || null,
      linkedin_url: body.linkedin_url || null,
      availability: body.availability || null,
      expected_hours: body.expected_hours || null,
      answers: body.answers || {},
      status: 'pending',
    })
    .select()
    .single()

  if (appErr) return NextResponse.json({ error: appErr.message }, { status: 500 })

  // ═══════════════════════════════════════════════════════════════
  // NEW: Create inbox message for venture owner
  // ═══════════════════════════════════════════════════════════════
  const recipientId = venture.founder_id || venture.user_id

  if (recipientId && recipientId !== user.id) {
    // Get applicant profile for message context
    const { data: applicant } = await supabase
      .from('users')
      .select('full_name, username')
      .eq('id', user.id)
      .single()

    const applicantName = applicant?.full_name || applicant?.username || 'A builder'
    const subject = 'New applicant for ' + role.title + ' at ' + venture.name

    const messageBody = [
      applicantName + ' just applied for the ' + role.title + ' role.',
      '',
      body.cover_letter ? 'Cover letter:\n' + body.cover_letter : '(No cover letter provided)',
      '',
      body.availability ? 'Availability: ' + body.availability : '',
      body.expected_hours ? 'Expected hours: ' + body.expected_hours + ' hrs/week' : '',
    ].filter(Boolean).join('\n')

    await supabase
      .from('inbox_messages')
      .insert({
        recipient_id: recipientId,
        sender_id: user.id,
        message_type: 'role_application',
        status: 'unread',
        subject: subject.slice(0, 200),
        body: messageBody.slice(0, 5000),
        reference_type: 'venture',
        reference_id: venture.id,
        reference_name: venture.name,
        reference_slug: venture.slug,
        metadata: {
          venture_role_application_id: application.id,
          venture_role_id: role.id,
          venture_role_title: role.title,
          venture_role_type: role.type,
          portfolio_url: body.portfolio_url,
          github_url: body.github_url,
          linkedin_url: body.linkedin_url,
          resume_url: body.resume_url,
        },
      })
      .then(() => {}, (e) => console.error('Inbox message insert failed:', e))
  }

  // Track signal
  await supabase.from('user_activity_signals').insert({
    user_id: user.id,
    signal_type: 'apply',
    entity_type: 'venture_role',
    entity_id: role.id,
    weight: 8.0,
  }).then(() => {}, () => {})

  return NextResponse.json({ application, success: true })
}