import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/ventures/[slug]/assessment/answers
 * Body: { table: string, fields: Record<string, any> }
 *
 * Universal upsert endpoint for the Questions tab.
 * Allows editing any assessment field on any allowed table.
 * Enforces ownership + whitelists tables/fields for safety.
 */

const ALLOWED_TABLES: Record<string, string[]> = {
  ventures: [
    'name', 'tagline', 'description', 'logo_url', 'cover_url',
    'stage', 'industry', 'sector', 'sub_category',
  ],
  venture_problems: [
    'problem_statement', 'affected_audience', 'problem_context',
    'impact_tags', 'impact_explanation', 'discovery_source', 'discovery_details',
  ],
  venture_insights: [
    'why_worth_solving', 'supporting_observations', 'overlooked_understanding',
    'evolved_thinking', 'falsifiable_evidence',
  ],
  venture_customer_profiles: [
    'first_customer', 'why_change_behavior',
    'user_persona', 'decision_maker', 'buyer_persona',
  ],
  venture_solutions: [
    'solution_description', 'how_it_solves_problem',
    'user_flow_before', 'user_flow_action', 'user_flow_product', 'user_flow_outcome',
    'mvp_definition', 'build_risk_tags', 'build_risk_explanation',
  ],
  venture_markets: [
    'initial_market', 'market_size_estimate', 'estimation_methodology',
    'serviceable_market', 'broader_opportunity',
    'distribution_channels', 'distribution_rationale',
  ],
  venture_differentiation: [
    'why_choose_us', 'why_reject_us', 'moat_from_larger_players',
  ],
  venture_founder_answers: [
    'why_solve_this', 'relevant_experience', 'founder_advantage', 'what_to_learn',
  ],
  venture_capabilities: [
    'capability_map', 'most_critical_gap',
  ],
  venture_risks: [
    'biggest_risk', 'risk_category', 'strategy_pivot_trigger',
  ],
  venture_next_moves: [
    'most_important_proof', 'proof_action_plan', 'thirty_day_focus', 'biggest_blocker',
  ],
}

const UNIQUE_UPSERT_TABLES = new Set([
  'venture_problems', 'venture_insights', 'venture_customer_profiles',
  'venture_solutions', 'venture_markets', 'venture_differentiation',
  'venture_capabilities', 'venture_risks', 'venture_next_moves',
])

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase
    .from('ventures')
    .select('id, user_id, founder_id')
    .eq('slug', slug)
    .maybeSingle()

  if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (venture.user_id !== user.id && venture.founder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const table = String(body.table || '')
    const fields = body.fields || {}

    if (!ALLOWED_TABLES[table]) {
      return NextResponse.json({ error: 'Table not allowed' }, { status: 400 })
    }

    // Whitelist fields
    const allowed = ALLOWED_TABLES[table]
    const clean: Record<string, any> = {}
    for (const [k, v] of Object.entries(fields)) {
      if (allowed.includes(k)) {
        clean[k] = v === '' ? null : v
      }
    }

    if (Object.keys(clean).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    let data: any = null
    let error: any = null

    if (table === 'ventures') {
      const res = await supabase
        .from('ventures')
        .update({ ...clean, updated_at: new Date().toISOString() })
        .eq('id', venture.id)
        .select()
        .single()
      data = res.data
      error = res.error
    } else if (table === 'venture_founder_answers') {
      const res = await supabase
        .from('venture_founder_answers')
        .upsert(
          { venture_id: venture.id, user_id: user.id, ...clean },
          { onConflict: 'venture_id,user_id' }
        )
        .select()
        .single()
      data = res.data
      error = res.error
    } else if (UNIQUE_UPSERT_TABLES.has(table)) {
      const res = await supabase
        .from(table)
        .upsert(
          { venture_id: venture.id, ...clean },
          { onConflict: 'venture_id' }
        )
        .select()
        .single()
      data = res.data
      error = res.error
    } else {
      return NextResponse.json({ error: 'Unsupported table' }, { status: 400 })
    }

    if (error) throw error

    // Recompute intelligence in background (best-effort)
    supabase
      .rpc('fn_compute_assessment_intelligence', { p_venture_id: venture.id })
      .then(() => {}, () => {})

    return NextResponse.json({ success: true, table, data })
  } catch (e: any) {
    console.error('Update answer error:', e)
    return NextResponse.json({ error: e?.message || 'Update failed' }, { status: 500 })
  }
}