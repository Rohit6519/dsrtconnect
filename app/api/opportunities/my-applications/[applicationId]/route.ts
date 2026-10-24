import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Fetch application (only if owned by current user)
    const { data: app } = await supabase
      .from('opportunity_applications')
      .select('*')
      .eq('id', applicationId)
      .eq('applicant_id', user.id)
      .single()

    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    // 2. Fetch opportunity
    const { data: opp } = await supabase
      .from('opportunities')
      .select('id, slug, title, opportunity_number, opportunity_type, status, poster_user_id, project_id, venture_id, application_deadline, work_mode, time_commitment, compensation_type, compensation_min, compensation_max, compensation_currency')
      .eq('id', app.opportunity_id)
      .single()

    // 3. Enrich opportunity context
    let project = null
    let venture = null
    let poster = null

    if (opp) {
      if (opp.project_id) {
        const { data: p } = await supabase.from('projects').select('id, name, slug, icon').eq('id', opp.project_id).single()
        project = p
      }
      if (opp.venture_id) {
        const { data: v } = await supabase.from('ventures').select('id, name, slug, logo_url').eq('id', opp.venture_id).single()
        venture = v
      }
      const { data: u } = await supabase.from('users').select('id, username, full_name, avatar_url, is_verified').eq('id', opp.poster_user_id).single()
      poster = u
    }

    // 4. Fetch timeline (status history)
    const { data: timeline } = await supabase
      .from('opportunity_application_history')
      .select('id, from_stage, to_stage, reason, created_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true })

    // 5. Fetch messages related to this application
    const { data: messages } = await supabase
      .from('inbox_messages')
      .select('id, sender_id, recipient_id, body, status, created_at, message_type')
      .eq('reference_type', 'opportunity')
      .eq('reference_id', app.opportunity_id)
      .order('created_at', { ascending: true })

    // Filter messages to ones that involve this specific application
    const appMessages = (messages || []).filter(
      (m: any) => m.metadata?.opportunity_application_id === applicationId ||
        (m.sender_id === user.id || m.recipient_id === user.id)
    )

    // Enrich message senders
    const senderIds = [...new Set(appMessages.map((m: any) => m.sender_id).filter(Boolean))]
    const { data: senders } = senderIds.length
      ? await supabase.from('users').select('id, username, full_name, avatar_url').in('id', senderIds)
      : { data: [] }
    const senderMap = new Map((senders || []).map((s: any) => [s.id, s]))

    // 6. Fetch custom questions (for read-only display)
    const { data: questions } = await supabase
      .from('opportunity_application_questions')
      .select('id, label, question_type, description, is_required, options:opportunity_application_question_options(*)')
      .eq('opportunity_id', app.opportunity_id)
      .order('order_index')

    // 7. Check for unread messages and mark them read
    await supabase
      .from('inbox_messages')
      .update({ status: 'read' })
      .eq('recipient_id', user.id)
      .eq('status', 'unread')
      .eq('reference_type', 'opportunity')
      .eq('reference_id', app.opportunity_id)

    return NextResponse.json({
      application: app,
      opportunity: opp ? { ...opp, project, venture, poster } : null,
      timeline: timeline || [],
      messages: appMessages.map((m: any) => ({
        ...m,
        sender: senderMap.get(m.sender_id) || null,
        is_mine: m.sender_id === user.id,
      })),
      questions: questions || [],
    })
  } catch (e: any) {
    console.error('Application detail error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}