import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/applications/WorkflowService'

export const dynamic = 'force-dynamic'

/** Candidate replies within their application thread. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const text = String(body.body || '').trim()
  if (!text) return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (text.length > 5000) return NextResponse.json({ error: 'Message too long' }, { status: 400 })

  const { data: app } = await supabase
    .from('opportunity_applications')
    .select('id, opportunity_id, applicant_id')
    .eq('id', appId)
    .single()
  if (!app || app.applicant_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, title, slug, poster_user_id')
    .eq('id', app.opportunity_id)
    .single()
  if (!opp) return NextResponse.json({ error: 'Opportunity gone' }, { status: 404 })

  const subject = body.subject
    ? String(body.subject).slice(0, 200)
    : `Re: ${opp.title}`.slice(0, 200)

  const { data: mail, error } = await supabase
    .from('inbox_messages')
    .insert({
      recipient_id: opp.poster_user_id,
      sender_id: user.id,
      message_type: 'application_reply',
      status: 'unread',
      subject,
      body: text,
      reference_type: 'opportunity_application',
      reference_id: app.id,
      reference_name: opp.title,
      reference_slug: opp.slug,
      metadata: {
        opportunity_application_id: app.id,
        opportunity_id: opp.id,
        from_candidate: true,
      },
    })
    .select('id, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also log as inbound application_communication row
  await supabase.from('application_communications').insert({
    application_id: app.id,
    opportunity_id: opp.id,
    subject,
    body_markdown: text,
    direction: 'inbound',
    channel: 'dsrt_mail',
    status: 'sent',
    recipient_id: opp.poster_user_id,
    sender_id: user.id,
    inbox_message_id: mail.id,
    sent_at: mail.created_at,
  })

  await WorkflowService.recordEvent({
    application_id: app.id,
    opportunity_id: app.opportunity_id,
    event_type: 'communication_replied',
    actor_id: user.id,
    source: 'api',
    metadata: { inbox_message_id: mail.id },
  })

  return NextResponse.json({ ok: true, message_id: mail.id })
}