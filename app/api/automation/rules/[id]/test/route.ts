import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AutomationDispatcher } from '@/lib/automation/AutomationDispatcher'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const application_id = body.application_id
  if (!application_id) return NextResponse.json({ error: 'application_id required' }, { status: 400 })

  const { data: app } = await supabase.from('opportunity_applications').select('id, opportunity_id').eq('id', application_id).single()
  const { data: rule } = await supabase.from('workflow_rules').select('*').eq('id', id).single()
  if (!app || !rule) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fabricate a synthetic event that matches the trigger
  await AutomationDispatcher.dispatch({
    application_id: app.id,
    opportunity_id: app.opportunity_id,
    triggering_event_id: null,
    event: { id: null, event_type: 'application_submitted', metadata: { test: true } },
    metadata: { test: true },
  })
  return NextResponse.json({ ok: true })
}