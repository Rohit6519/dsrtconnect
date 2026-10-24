import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/opportunities/applications/[appId]/draft
 * Load the full draft payload for the Application Studio.
 * Only the applicant can load their own draft.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: application, error: appErr } = await supabase
      .from('opportunity_applications')
      .select('*')
      .eq('id', appId)
      .eq('applicant_id', user.id)
      .single()

    if (appErr || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const { data: opportunity, error: oppErr } = await supabase
      .from('opportunities')
      .select(
        `
        id, slug, title, opportunity_type, status,
        poster_user_id, application_deadline, applications_open,
        time_commitment, hours_per_week,
        require_resume, require_portfolio, require_github,
        require_website, require_cover_letter,
        required_skills, preferred_skills, custom_questions
      `
      )
      .eq('id', application.opportunity_id)
      .single()

    if (oppErr || !opportunity) {
      return NextResponse.json({ error: 'Opportunity no longer exists' }, { status: 404 })
    }

    const { data: requirements } = await supabase
      .from('opportunity_skill_requirements')
      .select('*')
      .eq('opportunity_id', opportunity.id)

    const { data: dbQuestions } = await supabase
      .from('opportunity_application_questions')
      .select('*')
      .eq('opportunity_id', opportunity.id)
      .order('sort_order', { ascending: true, nullsFirst: false })

    let questionsWithOptions = dbQuestions || []
    if (questionsWithOptions.length > 0) {
      const qIds = questionsWithOptions.map((q: any) => q.id)
      const { data: options } = await supabase
        .from('opportunity_application_question_options')
        .select('*')
        .in('question_id', qIds)

      const optionsByQ = new Map<string, any[]>()
      for (const opt of options || []) {
        if (!optionsByQ.has(opt.question_id)) optionsByQ.set(opt.question_id, [])
        optionsByQ.get(opt.question_id)!.push(opt)
      }
      questionsWithOptions = questionsWithOptions.map((q: any) => ({
        ...q,
        options: optionsByQ.get(q.id) || [],
      }))
    }

    let questions = questionsWithOptions
    if ((!questions || questions.length === 0) && Array.isArray(opportunity.custom_questions)) {
      questions = (opportunity.custom_questions as any[]).map((q: any, i: number) => {
        if (typeof q === 'string') {
          return {
            id: `legacy_${i}`,
            label: q,
            question_type: 'text',
            is_required: false,
            sort_order: i,
            options: [],
          }
        }
        return {
          id: q.id || `legacy_${i}`,
          label: q.question || q.label || `Question ${i + 1}`,
          question_type: q.type || 'text',
          is_required: !!q.required || !!q.is_required,
          sort_order: i,
          options: Array.isArray(q.options)
            ? q.options.map((o: any, j: number) =>
                typeof o === 'string'
                  ? { id: `legacy_opt_${i}_${j}`, label: o, value: o }
                  : o
              )
            : [],
        }
      })
    }

    return NextResponse.json({
      application,
      opportunity,
      requirements: requirements || [],
      questions: questions || [],
    })
  } catch (e: any) {
    console.error('[draft GET] error:', e)
    return NextResponse.json(
      { error: e?.message || 'Failed to load draft' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/opportunities/applications/[appId]/draft
 * Autosave partial updates from the Application Studio.
 * Body: { patch: {...} }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const patch = body?.patch && typeof body.patch === 'object' ? body.patch : {}

  const ALLOWED = new Set([
    'cover_message',
    'cover_letter',
    'resume_url',
    'portfolio_url',
    'github_url',
    'linkedin_url',
    'website_url',
    'availability',
    'expected_hours',
    'proposed_start_date',
    'proposed_compensation',
    'proposed_compensation_type',
    'proposed_compensation_currency', // ← currency
    'answers',
    'highlighted_skills',
    'highlighted_projects',
    'highlighted_ventures',
    'attachments',
  ])

  const sanitized: Record<string, any> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (ALLOWED.has(k)) sanitized[k] = v
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: 'No allowed fields in patch' }, { status: 400 })
  }

  try {
    const { data: current, error: loadErr } = await supabase
      .from('opportunity_applications')
      .select('id, applicant_id, pipeline_stage')
      .eq('id', appId)
      .single()

    if (loadErr || !current) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }
    if (current.applicant_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (current.pipeline_stage !== 'draft') {
      return NextResponse.json({ error: 'Application already submitted' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()

    const { data: updated, error: updErr } = await supabase
      .from('opportunity_applications')
      .update({ ...sanitized, updated_at: nowIso })
      .eq('id', appId)
      .eq('applicant_id', user.id)
      .eq('pipeline_stage', 'draft')
      .select('updated_at')
      .single()

    if (updErr) throw updErr

    return NextResponse.json({ ok: true, updated_at: updated.updated_at })
  } catch (e: any) {
    console.error('[draft PATCH] error:', e)
    return NextResponse.json({ error: e?.message || 'Save failed' }, { status: 500 })
  }
}