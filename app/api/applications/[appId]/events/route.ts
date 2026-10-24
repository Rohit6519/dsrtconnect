import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: app } = await supabase
    .from('opportunity_applications')
    .select('id, opportunity_id, applicant_id')
    .eq('id', appId)
    .single()
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Access check
  const isApplicant = app.applicant_id === user.id
  let allowed = isApplicant
  if (!allowed) {
    const { data: opp } = await supabase
      .from('opportunities').select('poster_user_id').eq('id', app.opportunity_id).single()
    allowed = !!opp && opp.poster_user_id === user.id
  }
  if (!allowed) {
    const { data: m } = await supabase
      .from('opportunity_members').select('role')
      .eq('opportunity_id', app.opportunity_id).eq('user_id', user.id).maybeSingle()
    allowed = !!m
  }
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: events } = await supabase
    .from('application_workflow_events')
    .select('id, event_type, actor_id, actor_role, from_stage, to_stage, source, reason, metadata, created_at')
    .eq('application_id', appId)
    .order('created_at', { ascending: true })

  // For applicants: filter out internal-only signals to avoid leaks
  let filtered = events || []
  if (isApplicant) {
    const HIDDEN_FOR_APPLICANT = new Set(['note_added', 'starred', 'unstarred', 'reviewer_assigned', 'reviewer_unassigned'])
    filtered = filtered.filter(e => !HIDDEN_FOR_APPLICANT.has(e.event_type))
  }

  return NextResponse.json({ events: filtered })
}