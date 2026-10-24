import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/applications/WorkflowService'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('interview_feedback').select('*').eq('interview_id', id)
  return NextResponse.json({ feedback: data || [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const {
    recommendation, scores = {}, overall_rating = null,
    strengths = null, concerns = null, private_notes = null,
    followup_needed = false,
  } = body

  if (!recommendation) return NextResponse.json({ error: 'recommendation required' }, { status: 400 })

  const { data: iv } = await supabase.from('interviews')
    .select('application_id, opportunity_id').eq('id', id).single()
  if (!iv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase.from('interview_feedback').upsert({
    interview_id: id,
    reviewer_id: user.id,
    recommendation, scores, overall_rating,
    strengths, concerns, private_notes, followup_needed,
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'interview_id,reviewer_id' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await WorkflowService.recordEvent({
    application_id: iv.application_id,
    opportunity_id: iv.opportunity_id,
    event_type: 'interview_feedback_submitted' as any,
    actor_id: user.id,
    source: 'api',
    metadata: { interview_id: id, recommendation, overall_rating },
  })

  return NextResponse.json({ feedback: data })
}