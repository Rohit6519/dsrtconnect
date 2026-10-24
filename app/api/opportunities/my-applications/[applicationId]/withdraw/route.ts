import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackOpportunityEvent } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const reason = String(body.reason || 'not_specified')
  const note = body.note ? String(body.note).slice(0, 500) : null

  try {
    // 1. Fetch Application to ensure ownership and current state
    const { data: app } = await supabase
      .from('opportunity_applications')
      .select('id, opportunity_id, pipeline_stage')
      .eq('id', applicationId)
      .eq('applicant_id', user.id)
      .single()

    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    
    // Check if they are allowed to withdraw
    if (['withdrawn', 'declined', 'accepted', 'draft'].includes(app.pipeline_stage)) {
      return NextResponse.json({ error: 'Cannot withdraw from this stage' }, { status: 400 })
    }

    // 2. Perform the withdrawal update
    const { data: updatedApp, error: updateError } = await supabase
      .from('opportunity_applications')
      .update({
        pipeline_stage: 'withdrawn',
        status: 'withdrawn',
        stage_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single()

    if (updateError) throw updateError

    // 3. Record History (Wrapped in try/catch to fix TS error)
    try {
      await supabase.from('opportunity_application_history').insert({
        application_id: applicationId,
        opportunity_id: app.opportunity_id,
        from_stage: app.pipeline_stage,
        to_stage: 'withdrawn',
        changed_by: user.id,
        reason: reason,
        metadata: note ? { withdrawal_note: note } : {},
        created_at: new Date().toISOString()
      })
    } catch (e) {
      console.error('Failed to log withdrawal history:', e)
    }

    // 4. Track Analytics Event (Wrapped in try/catch to fix TS error)
    try {
      await trackOpportunityEvent({
        opportunity_id: app.opportunity_id,
        user_id: user.id,
        event_type: 'application_abandoned',
        source: 'applicant_dashboard',
        metadata: {
          application_id: applicationId,
          previous_stage: app.pipeline_stage,
          withdrawal_reason: reason,
          withdrawal_note: note
        },
      })
    } catch (e) {
      // ignore event tracking failures
    }

    return NextResponse.json({ ok: true, application: updatedApp })
  } catch (e: any) {
    console.error('Withdraw error:', e)
    return NextResponse.json({ error: e?.message || 'Withdrawal failed' }, { status: 500 })
  }
}