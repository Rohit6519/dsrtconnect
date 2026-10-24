import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/applications/WorkflowService'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Fetch Application
    const { data: app, error: appErr } = await supabase
      .from('opportunity_applications')
      .select('*')
      .eq('id', appId)
      .eq('applicant_id', user.id)
      .single()
    if (appErr || !app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (app.pipeline_stage !== 'draft') {
      return NextResponse.json({ error: 'Application already submitted' }, { status: 400 })
    }

    // 2. Opportunity + questions
    const [{ data: opp }, { data: questions }] = await Promise.all([
      supabase.from('opportunities').select('*').eq('id', app.opportunity_id).single(),
      supabase.from('opportunity_application_questions').select('*').eq('opportunity_id', app.opportunity_id),
    ])
    if (!opp) return NextResponse.json({ error: 'Opportunity no longer exists' }, { status: 404 })

    // 3. Validation (unchanged)
    const errors: { field: string; message: string; step: string }[] = []
    if (!opp.applications_open || !['active', 'closing-soon'].includes(opp.status)) {
      return NextResponse.json({ error: 'Applications are currently closed for this opportunity.' }, { status: 400 })
    }
    if (opp.application_deadline && new Date(opp.application_deadline) < new Date()) {
      return NextResponse.json({ error: 'The application deadline has passed.' }, { status: 400 })
    }
    if (opp.require_resume && !app.resume_url) errors.push({ field: 'resume_url', message: 'Resume URL is required.', step: 'evidence' })
    if (opp.require_portfolio && !app.portfolio_url && !app.website_url) errors.push({ field: 'portfolio_url', message: 'Portfolio or Website URL is required.', step: 'evidence' })
    if (opp.require_github && !app.github_url) errors.push({ field: 'github_url', message: 'GitHub URL is required.', step: 'evidence' })
    if (opp.require_cover_letter && !app.cover_message && !app.cover_letter) {
      errors.push({ field: 'cover_message', message: 'An intro message is required.', step: 'evidence' })
    }

    const answers = app.answers || {}
    for (const q of questions || []) {
      if (!q.is_required) continue
      let isVisible = true
      if (q.conditions?.show_if?.question_id) {
        const c = q.conditions.show_if
        const parentAns = String(answers[c.question_id] || '').toLowerCase()
        const valStr = String(c.value).toLowerCase()
        if (c.operator === 'equals' && parentAns !== valStr) isVisible = false
        if (c.operator === 'not_equals' && parentAns === valStr) isVisible = false
        if (c.operator === 'contains' && !parentAns.includes(valStr)) isVisible = false
      }
      if (!isVisible) continue
      const ans = answers[q.id]
      const isAnswered = ans !== undefined && ans !== null && ans !== '' && (Array.isArray(ans) ? ans.length > 0 : true)
      if (!isAnswered) errors.push({ field: `q_${q.id}`, message: `Required question: "${q.label}"`, step: 'questions' })
    }

    if (errors.length > 0) return NextResponse.json({ ok: false, errors }, { status: 400 })

    // 4. All-through-service transition
    const result = await WorkflowService.transition({
      application_id: appId,
      target_stage: 'submitted',
      actor_id: user.id,
      source: 'submit_endpoint',
      options: {
        notify_owner: true,
        notify_owner_in_app: true,
        notify_candidate: false,
      },
    })

    return NextResponse.json({ ok: true, application_id: result.application_id })
  } catch (e: any) {
    console.error('Application submit error:', e)
    return NextResponse.json({ error: e?.message || 'Submission failed' }, { status: 500 })
  }
}