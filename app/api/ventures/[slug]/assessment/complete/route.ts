import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/ventures/[slug]/assessment/complete
 * Validates all 10 steps and atomically publishes the venture.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const idempotencyKey = req.headers.get('x-idempotency-key')

  const { data: venture } = await supabase
    .from('ventures')
    .select('id, slug, name, user_id, founder_id, assessment_status')
    .eq('slug', slug)
    .maybeSingle()
  if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (venture.user_id !== user.id && venture.founder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Idempotency
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from('venture_idempotency_keys')
      .select('response')
      .eq('key', idempotencyKey)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) return NextResponse.json(existing.response)
  }

  // Validate required minimums
  const validation = await validateAssessment(supabase, venture.id)
  if (!validation.valid) {
    return NextResponse.json({
      error: 'Assessment incomplete',
      missing: validation.missing,
    }, { status: 400 })
  }

  try {
    // Call atomic publish RPC
    const { data: publishResult, error: publishError } = await supabase
      .rpc('fn_publish_venture_assessment', {
        p_venture_id: venture.id,
        p_user_id: user.id,
      })

    if (publishError) throw publishError

    const response = {
      success: true,
      venture: {
        id: venture.id,
        slug: venture.slug,
        name: venture.name,
      },
      intelligence: publishResult?.intelligence,
      redirect_url: `/ventures/${venture.slug}`,
    }

    if (idempotencyKey) {
      await supabase.from('venture_idempotency_keys').insert({
        key: idempotencyKey,
        user_id: user.id,
        venture_id: venture.id,
        action: 'publish_assessment',
        response,
      }).then(() => {}, () => {})
    }

    return NextResponse.json(response)
  } catch (e: any) {
    console.error('Publish error:', e)
    return NextResponse.json({ error: e?.message || 'Publish failed' }, { status: 500 })
  }
}

// ═════════════════════════════════════════════════════════════════════
// VALIDATION: ensures minimum quality before publishing
// ═════════════════════════════════════════════════════════════════════

async function validateAssessment(supabase: any, ventureId: string) {
  const missing: { step: number; field: string; label: string }[] = []

  const [venture, problem, insight, customer, solution, market, milestones, nextMove] = await Promise.all([
    supabase.from('ventures').select('name, tagline, stage, industry').eq('id', ventureId).single(),
    supabase.from('venture_problems').select('problem_statement, affected_audience').eq('venture_id', ventureId).maybeSingle(),
    supabase.from('venture_insights').select('why_worth_solving').eq('venture_id', ventureId).maybeSingle(),
    supabase.from('venture_customer_profiles').select('first_customer').eq('venture_id', ventureId).maybeSingle(),
    supabase.from('venture_solutions').select('solution_description, mvp_definition').eq('venture_id', ventureId).maybeSingle(),
    supabase.from('venture_markets').select('initial_market').eq('venture_id', ventureId).maybeSingle(),
    supabase.from('venture_milestones').select('id').eq('venture_id', ventureId).limit(1),
    supabase.from('venture_next_moves').select('thirty_day_focus, most_important_proof').eq('venture_id', ventureId).maybeSingle(),
  ])

  // Step 1
  if (!venture.data?.name) missing.push({ step: 1, field: 'name', label: 'Venture name' })
  if (!venture.data?.stage) missing.push({ step: 1, field: 'stage', label: 'Venture stage' })
  if (!venture.data?.industry) missing.push({ step: 1, field: 'industry', label: 'Primary sector' })

  // Step 2
  if (!problem.data?.problem_statement) missing.push({ step: 2, field: 'problem_statement', label: 'Problem statement' })
  if (!problem.data?.affected_audience) missing.push({ step: 2, field: 'affected_audience', label: 'Affected audience' })

  // Step 3
  if (!insight.data?.why_worth_solving) missing.push({ step: 3, field: 'why_worth_solving', label: 'Why worth solving' })

  // Step 4
  if (!customer.data?.first_customer) missing.push({ step: 4, field: 'first_customer', label: 'First customer' })

  // Step 5
  if (!solution.data?.solution_description) missing.push({ step: 5, field: 'solution_description', label: 'Solution description' })
  if (!solution.data?.mvp_definition) missing.push({ step: 5, field: 'mvp_definition', label: 'MVP definition' })

  // Step 6
  if (!market.data?.initial_market) missing.push({ step: 6, field: 'initial_market', label: 'Initial market' })

  // Step 10
  if (!nextMove.data?.thirty_day_focus) missing.push({ step: 10, field: 'thirty_day_focus', label: '30-day focus' })
  if (!nextMove.data?.most_important_proof) missing.push({ step: 10, field: 'most_important_proof', label: 'Most important proof' })
  if ((milestones.data || []).length === 0) missing.push({ step: 10, field: 'milestones', label: 'At least one milestone' })

  return { valid: missing.length === 0, missing }
}